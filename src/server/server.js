/**
 * YT-Trimmer Server v2.1
 * Improved version with proper logging, config, and utilities
 */

const express = require('express');
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');
const cors = require('cors');
const fs = require('fs');

// Load configuration and utilities
const config = require('../config');
const logger = require('../utils/logger');
const validators = require('../utils/validators');
const { diskSpaceMiddleware, checkAvailableSpace } = require('../utils/diskChecker');

const execPromise = util.promisify(exec);
const app = express();

// Store for SSE connections and task progress
const progressStreams = new Map();
const taskProgress = new Map();

// Rate limiting - simple in-memory store
const rateLimitStore = new Map();

// ===========================================
// MIDDLEWARE
// ===========================================

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Rate limiter middleware
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, startTime: now });
    return next();
  }

  const record = rateLimitStore.get(ip);

  if (now - record.startTime > config.rateLimit.windowMs) {
    rateLimitStore.set(ip, { count: 1, startTime: now });
    return next();
  }

  if (record.count >= config.rateLimit.max) {
    logger.warn('Rate limit exceeded', { ip, count: record.count });
    return res.status(429).json({
      success: false,
      message: 'Terlalu banyak request. Silakan tunggu 1 menit.'
    });
  }

  record.count++;
  next();
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now - record.startTime > config.rateLimit.windowMs) {
      rateLimitStore.delete(ip);
    }
  }
}, 60000);

// ===========================================
// SERVE STATIC FILES
// ===========================================

app.use(express.static(path.join(__dirname, config.paths.public)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, config.paths.public, 'index.html'));
});

// ===========================================
// GET VIDEO INFO (for preview)
// ===========================================

app.get('/video-info', rateLimiter, async (req, res) => {
  const { url } = req.query;

  const sanitizedUrl = validators.sanitizeYouTubeUrl(url);
  if (!sanitizedUrl) {
    return res.status(400).json({
      success: false,
      message: 'URL YouTube tidak valid'
    });
  }

  const videoId = validators.extractVideoId(sanitizedUrl);

  try {
    logger.info('Fetching video info', { url: sanitizedUrl, videoId });

    // Get video info using yt-dlp
    const cmd = `yt-dlp --cookies ./cookies.txt --dump-json --no-download "${sanitizedUrl}"`;
    const { stdout } = await execPromise(cmd, {
      maxBuffer: 1024 * 1024 * 5,
      timeout: 30000
    });

    const info = JSON.parse(stdout);

    res.json({
      success: true,
      data: {
        id: videoId,
        title: info.title || 'Unknown Title',
        duration: info.duration || 0,
        durationFormatted: info.duration_string || '00:00',
        thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        uploader: info.uploader || 'Unknown',
        viewCount: info.view_count || 0,
        formats: {
          video: config.video.supportedQualities,
          audio: ['mp3']
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching video info', { error: error.message, url: sanitizedUrl });

    // Fallback - return basic info using video ID
    res.json({
      success: true,
      data: {
        id: videoId,
        title: 'Video YouTube',
        duration: 0,
        durationFormatted: '??:??',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        uploader: 'Unknown',
        viewCount: 0,
        formats: {
          video: config.video.supportedQualities,
          audio: ['mp3']
        }
      }
    });
  }
});

// ===========================================
// SSE PROGRESS ENDPOINT
// ===========================================

app.get('/progress/:taskId', (req, res) => {
  const { taskId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ status: 'connected', progress: 0 })}\n\n`);

  // Store the response object
  progressStreams.set(taskId, res);

  logger.debug('SSE connection established', { taskId });

  // Cleanup on close
  req.on('close', () => {
    progressStreams.delete(taskId);
    logger.debug('SSE connection closed', { taskId });
  });
});

/**
 * Send progress update to SSE client
 */
function sendProgress(taskId, data) {
  const stream = progressStreams.get(taskId);
  if (stream) {
    stream.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  taskProgress.set(taskId, data);
  logger.task(taskId, data.status, data.message || '', { progress: data.progress });
}

// ===========================================
// TRIM ENDPOINT (Main functionality)
// ===========================================

app.post('/trim', rateLimiter, diskSpaceMiddleware, async (req, res) => {
  logger.info('Received trim request', { body: { ...req.body, url: '[REDACTED]' } });

  // Validate all inputs
  const validation = validators.validateTrimRequest(req.body);

  if (!validation.isValid) {
    logger.warn('Validation failed', { errors: validation.errors });
    return res.status(400).json({
      success: false,
      message: validation.errors.join('. ')
    });
  }

  const { url, start, end, filename, format, quality } = validation.data;

  // Calculate duration
  const startSec = validators.timeToSeconds(start);
  const endSec = validators.timeToSeconds(end);
  const duration = endSec - startSec;

  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const extension = format === 'mp3' ? 'mp3' : 'mp4';
  const finalFile = path.join(__dirname, `../../${filename}.${extension}`);
  const outputFilename = `${filename}.${extension}`;

  logger.info('Processing trim request', {
    taskId,
    start,
    end,
    duration,
    format,
    quality,
    filename: outputFilename
  });

  // Send initial response with taskId
  res.json({
    success: true,
    taskId: taskId,
    message: 'Proses dimulai. Silakan pantau progress.'
  });

  // Process in background
  processVideo(taskId, {
    url,
    start,
    end,
    duration,
    format,
    quality,
    finalFile,
    filename: outputFilename
  });
});

// ===========================================
// MULTI-TRIM ENDPOINT
// ===========================================

app.post('/multi-trim', rateLimiter, diskSpaceMiddleware, async (req, res) => {
  logger.info('Received multi-trim request', { body: { ...req.body, url: '[REDACTED]' } });

  const { url, intervals, filename, format, quality, concat } = req.body;

  // Validate URL
  const sanitizedUrl = validators.sanitizeYouTubeUrl(url);
  if (!sanitizedUrl) {
    return res.status(400).json({
      success: false,
      message: 'URL YouTube tidak valid'
    });
  }

  // Validate intervals
  if (!intervals || !Array.isArray(intervals) || intervals.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Minimal harus ada 1 interval waktu'
    });
  }

  if (intervals.length > 10) {
    return res.status(400).json({
      success: false,
      message: 'Maksimal 10 interval per request'
    });
  }

  // Validate each interval
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    if (!Array.isArray(interval) || interval.length !== 2) {
      return res.status(400).json({
        success: false,
        message: `Format interval #${i + 1} tidak valid`
      });
    }

    const start = validators.validateTimeFormat(interval[0]);
    const end = validators.validateTimeFormat(interval[1]);

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: `Format waktu interval #${i + 1} tidak valid`
      });
    }

    const startSec = validators.timeToSeconds(start);
    const endSec = validators.timeToSeconds(end);
    if (endSec <= startSec) {
      return res.status(400).json({
        success: false,
        message: `Waktu selesai harus lebih besar dari waktu mulai pada interval #${i + 1}`
      });
    }
  }

  const taskId = `multi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const sanitizedFilename = validators.sanitizeFilename(filename || 'video-multi');
  const extension = format === 'mp3' ? 'mp3' : 'mp4';

  logger.info('Processing multi-trim request', {
    taskId,
    intervalCount: intervals.length,
    format,
    quality,
    concat,
    filename: sanitizedFilename
  });

  // Send initial response with taskId
  res.json({
    success: true,
    taskId: taskId,
    message: `Memproses ${intervals.length} interval. Silakan pantau progress.`
  });

  // Process in background
  processMultiVideo(taskId, {
    url: sanitizedUrl,
    intervals,
    format: format || 'mp4',
    quality: quality || '720',
    concat: concat || false,
    baseFilename: sanitizedFilename,
    extension
  });
});

/**
 * Process multiple video intervals
 */
async function processMultiVideo(taskId, options) {
  const { url, intervals, format, quality, concat, baseFilename, extension } = options;
  const outputFiles = [];

  try {
    // Step 1: Get stream URLs
    sendProgress(taskId, {
      status: 'downloading',
      progress: 5,
      message: 'Mengambil stream URL...'
    });

    let videoStreamUrl = '';
    let audioStreamUrl = '';

    // Get video stream URL
    await new Promise((resolve, reject) => {
      const formatSelector = format === 'mp3'
        ? 'bestaudio[ext=m4a]/bestaudio/best'
        : `bestvideo[height<=${quality}][ext=mp4]/bestvideo[height<=${quality}]/best[height<=${quality}]`;

      const getUrlCmd = `yt-dlp --cookies ./cookies.txt -f "${formatSelector}" -g "${url}"`;
      const process = spawn(getUrlCmd, [], { shell: true });
      let output = '';

      process.stdout.on('data', (data) => { output += data.toString(); });
      process.on('close', (code) => {
        if (code === 0 && output.trim()) {
          videoStreamUrl = output.trim().split('\n')[0];
          resolve();
        } else {
          reject(new Error('Gagal mendapatkan stream URL'));
        }
      });
      process.on('error', reject);
    });

    // Get audio stream URL (for video format)
    if (format !== 'mp3') {
      await new Promise((resolve) => {
        const getAudioCmd = `yt-dlp --cookies ./cookies.txt -f "bestaudio[ext=m4a]/bestaudio" -g "${url}"`;
        const process = spawn(getAudioCmd, [], { shell: true });
        let output = '';

        process.stdout.on('data', (data) => { output += data.toString(); });
        process.on('close', (code) => {
          if (code === 0 && output.trim()) {
            audioStreamUrl = output.trim().split('\n')[0];
          }
          resolve();
        });
        process.on('error', () => resolve());
      });
    }

    logger.info('Stream URLs obtained for multi-trim', { taskId });

    // Step 2: Process each interval
    const progressPerInterval = 80 / intervals.length;

    for (let i = 0; i < intervals.length; i++) {
      const [start, end] = intervals[i];
      const startSec = validators.timeToSeconds(start);
      const endSec = validators.timeToSeconds(end);
      const duration = endSec - startSec;

      const partFilename = concat ? `temp_${taskId}_part${i + 1}.${extension}` : `${baseFilename}_part${i + 1}.${extension}`;
      const outputFile = path.join(__dirname, `../../${partFilename}`);

      const baseProgress = 10 + (progressPerInterval * i);

      sendProgress(taskId, {
        status: 'trimming',
        progress: Math.round(baseProgress),
        message: `Memotong bagian ${i + 1} dari ${intervals.length}...`
      });

      // Process with FFmpeg
      await new Promise((resolve, reject) => {
        let ffmpegCmd;

        if (format === 'mp3') {
          ffmpegCmd = `ffmpeg -ss ${start} -i "${videoStreamUrl}" -t ${duration} -vn -c:a libmp3lame -q:a 2 -y "${outputFile}"`;
        } else if (audioStreamUrl) {
          ffmpegCmd = `ffmpeg -ss ${start} -i "${videoStreamUrl}" -ss ${start} -i "${audioStreamUrl}" -t ${duration} -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -avoid_negative_ts make_zero -y "${outputFile}"`;
        } else {
          ffmpegCmd = `ffmpeg -ss ${start} -i "${videoStreamUrl}" -t ${duration} -c:v copy -c:a copy -avoid_negative_ts make_zero -y "${outputFile}"`;
        }

        const ffProcess = spawn(ffmpegCmd, [], { shell: true });

        ffProcess.on('close', (code) => {
          if (code === 0) {
            outputFiles.push(outputFile);
            resolve();
          } else {
            reject(new Error(`FFmpeg error pada bagian ${i + 1}`));
          }
        });
        ffProcess.on('error', reject);
      });

      logger.info(`Part ${i + 1} completed`, { taskId });
    }

    // Step 3: Concat if requested
    let finalFile = outputFiles[0];
    let finalFilename = `${baseFilename}_part1.${extension}`;

    if (concat && outputFiles.length > 1) {
      sendProgress(taskId, {
        status: 'trimming',
        progress: 90,
        message: 'Menggabungkan semua bagian...'
      });

      finalFile = path.join(__dirname, `../../${baseFilename}.${extension}`);
      finalFilename = `${baseFilename}.${extension}`;

      // Create concat list file
      const listFile = path.join(__dirname, `../../concat_${taskId}.txt`);
      const listContent = outputFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(listFile, listContent);

      // Concat with FFmpeg
      await new Promise((resolve, reject) => {
        const concatCmd = `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy -y "${finalFile}"`;
        const ffProcess = spawn(concatCmd, [], { shell: true });

        ffProcess.on('close', (code) => {
          // Cleanup temp files
          try {
            fs.unlinkSync(listFile);
            outputFiles.forEach(f => {
              if (fs.existsSync(f)) fs.unlinkSync(f);
            });
          } catch (e) { }

          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Gagal menggabungkan file'));
          }
        });
        ffProcess.on('error', reject);
      });

      logger.info('Concat completed', { taskId });
    }

    // Step 4: Complete
    sendProgress(taskId, {
      status: 'complete',
      progress: 100,
      message: concat ? 'Selesai! Mengunduh file...' : `Selesai! ${intervals.length} file siap diunduh`,
      filename: finalFilename
    });

    logger.info('Multi-trim completed', { taskId, outputCount: concat ? 1 : outputFiles.length });

  } catch (error) {
    logger.error('Error in multi-trim', { taskId, error: error.message });

    // Cleanup
    outputFiles.forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { }
    });

    sendProgress(taskId, {
      status: 'error',
      progress: 0,
      message: `Error: ${error.message}`
    });
  }
}

/**
 * Process video download and trim
 * Uses direct stream URL for faster and more accurate trimming
 */
async function processVideo(taskId, options) {
  const { url, start, end, duration, format, quality, finalFile, filename } = options;

  try {
    sendProgress(taskId, {
      status: 'downloading',
      progress: 5,
      message: 'Mengambil informasi video...'
    });

    logger.info('Starting video process', { taskId, format, quality, start, end, duration });

    // Step 1: Get direct stream URLs using yt-dlp -g
    sendProgress(taskId, {
      status: 'downloading',
      progress: 10,
      message: 'Mengambil stream URL...'
    });

    let videoStreamUrl = '';
    let audioStreamUrl = '';

    // Get video stream URL
    await new Promise((resolve, reject) => {
      const formatSelector = format === 'mp3'
        ? 'bestaudio[ext=m4a]/bestaudio/best'
        : `bestvideo[height<=${quality}][ext=mp4]/bestvideo[height<=${quality}]/best[height<=${quality}]`;

      const getUrlCmd = `yt-dlp --cookies ./cookies.txt -f "${formatSelector}" -g "${url}"`;
      logger.debug('Getting stream URL', { taskId, cmd: getUrlCmd.replace(url, '[URL]') });

      const process = spawn(getUrlCmd, [], { shell: true });
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && output.trim()) {
          videoStreamUrl = output.trim().split('\n')[0];
          resolve();
        } else {
          reject(new Error(`Gagal mendapatkan video URL: ${errorOutput.substring(0, 200)}`));
        }
      });

      process.on('error', reject);
    });

    // Get audio stream URL (for video format only)
    if (format !== 'mp3') {
      sendProgress(taskId, {
        status: 'downloading',
        progress: 20,
        message: 'Mengambil audio stream URL...'
      });

      await new Promise((resolve, reject) => {
        const getAudioCmd = `yt-dlp --cookies ./cookies.txt -f "bestaudio[ext=m4a]/bestaudio" -g "${url}"`;

        const process = spawn(getAudioCmd, [], { shell: true });
        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0 && output.trim()) {
            audioStreamUrl = output.trim().split('\n')[0];
            resolve();
          } else {
            // Audio not found is not fatal, we continue with video only
            logger.warn('Audio stream not found, continuing with video only', { taskId });
            resolve();
          }
        });

        process.on('error', (err) => {
          logger.warn('Error getting audio stream', { taskId, error: err.message });
          resolve(); // Continue without audio
        });
      });
    }

    logger.info('Stream URLs obtained', {
      taskId,
      hasVideo: !!videoStreamUrl,
      hasAudio: !!audioStreamUrl
    });

    // Step 2: Process with FFmpeg using direct stream URLs
    sendProgress(taskId, {
      status: 'trimming',
      progress: 30,
      message: 'Memproses dan memotong video...'
    });

    await new Promise((resolve, reject) => {
      let ffmpegCmd;

      if (format === 'mp3') {
        // Audio only
        ffmpegCmd = `ffmpeg -ss ${start} -i "${videoStreamUrl}" -t ${duration} -vn -c:a libmp3lame -q:a 2 -y "${finalFile}"`;
      } else if (audioStreamUrl) {
        // Video + Audio with separate streams (most accurate)
        ffmpegCmd = `ffmpeg -ss ${start} -i "${videoStreamUrl}" -ss ${start} -i "${audioStreamUrl}" -t ${duration} -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -avoid_negative_ts make_zero -y "${finalFile}"`;
      } else {
        // Video only (no audio stream found)
        ffmpegCmd = `ffmpeg -ss ${start} -i "${videoStreamUrl}" -t ${duration} -c:v copy -c:a copy -avoid_negative_ts make_zero -y "${finalFile}"`;
      }

      logger.debug('FFmpeg command', { taskId, cmd: 'ffmpeg [redacted]' });

      const ffProcess = spawn(ffmpegCmd, [], { shell: true });
      let lastProgressUpdate = 30;
      let errorOutput = '';

      ffProcess.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;

        // Parse FFmpeg progress from time=
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          const currentSec = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
          const progressPercent = Math.min(30 + (currentSec / duration) * 60, 90);

          if (progressPercent > lastProgressUpdate + 5) {
            lastProgressUpdate = progressPercent;
            sendProgress(taskId, {
              status: 'trimming',
              progress: Math.round(progressPercent),
              message: `Memotong video... ${Math.round((currentSec / duration) * 100)}%`
            });
          }
        }
      });

      ffProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          logger.error('FFmpeg failed', { taskId, code, errorOutput: errorOutput.substring(0, 500) });
          reject(new Error(`FFmpeg error (code ${code})`));
        }
      });

      ffProcess.on('error', (err) => {
        logger.error('FFmpeg spawn error', { taskId, error: err.message });
        reject(err);
      });
    });

    // Step 3: Verify output file
    sendProgress(taskId, {
      status: 'cleaning',
      progress: 95,
      message: 'Memverifikasi file hasil...'
    });

    if (!fs.existsSync(finalFile)) {
      throw new Error('File hasil trim tidak ditemukan');
    }

    const fileStats = fs.statSync(finalFile);
    if (fileStats.size < 1000) {
      throw new Error('File hasil terlalu kecil, kemungkinan gagal');
    }

    logger.info('File verified', { taskId, size: fileStats.size });

    // Step 4: Complete!
    sendProgress(taskId, {
      status: 'complete',
      progress: 100,
      message: 'Selesai! Mengunduh file...',
      filename: filename
    });

    logger.info('Task completed successfully', { taskId, filename, finalFile });

  } catch (error) {
    logger.error('Error processing video', { taskId, error: error.message, stack: error.stack });

    // Cleanup on error
    try {
      if (fs.existsSync(finalFile)) {
        fs.unlinkSync(finalFile);
      }
    } catch (e) { }

    sendProgress(taskId, {
      status: 'error',
      progress: 0,
      message: `Error: ${error.message}`
    });
  }
}

// ===========================================
// DOWNLOAD ENDPOINT
// ===========================================

app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;

  // Sanitize filename
  const sanitized = validators.sanitizeFilename(filename.replace(/\.(mp4|mp3)$/, ''));
  const extension = filename.endsWith('.mp3') ? 'mp3' : 'mp4';
  const safeFilename = `${sanitized}.${extension}`;

  const filePath = path.join(__dirname, `../../${safeFilename}`);

  logger.info('Download requested', { filename: safeFilename });

  if (!fs.existsSync(filePath)) {
    logger.warn('File not found', { filename: safeFilename });
    return res.status(404).json({
      success: false,
      message: 'File tidak ditemukan'
    });
  }

  // Set headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', extension === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  // Stream file to client
  const fileStream = fs.createReadStream(filePath);

  fileStream.pipe(res);

  // Delete file after download completes (if enabled)
  fileStream.on('end', () => {
    if (config.cleanup.autoDeleteAfterDownload) {
      logger.info('Download complete, cleaning up', { filename: safeFilename });
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.debug('File deleted after download', { filename: safeFilename });
          }
        } catch (e) {
          logger.warn('Could not delete file after download', { error: e.message });
        }
      }, 2000);
    }
  });

  fileStream.on('error', (err) => {
    logger.error('Stream error', { error: err.message, filename: safeFilename });
    res.status(500).json({
      success: false,
      message: 'Error streaming file'
    });
  });
});

// ===========================================
// UTILITY ENDPOINTS
// ===========================================

app.get('/health', async (req, res) => {
  const diskStatus = await checkAvailableSpace();

  res.json({
    status: 'OK',
    message: 'YT-Trimmer Server is running',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    disk: {
      freeSpaceMB: diskStatus.freeSpaceMB,
      hasEnoughSpace: diskStatus.hasSpace
    }
  });
});

// 404 handler
app.use((req, res) => {
  logger.debug('404 Not Found', { path: req.path });
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ===========================================
// PERIODIC CLEANUP
// ===========================================

// Cleanup old temp files periodically
setInterval(() => {
  const baseDir = path.join(__dirname, '../../');

  try {
    const files = fs.readdirSync(baseDir);
    const now = Date.now();

    files.forEach(file => {
      if (file.startsWith('temp_') && (file.endsWith('.mp4') || file.endsWith('.mp3'))) {
        const filePath = path.join(baseDir, file);
        const stats = fs.statSync(filePath);
        const ageMs = now - stats.mtimeMs;

        // Delete temp files older than 1 hour
        if (ageMs > config.cleanup.cleanupIntervalMs) {
          fs.unlinkSync(filePath);
          logger.info('Cleaned up old temp file', { file });
        }
      }
    });
  } catch (e) {
    logger.warn('Error during cleanup', { error: e.message });
  }
}, config.cleanup.cleanupIntervalMs);

// ===========================================
// START SERVER
// ===========================================

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const port = process.env.PORT || 3000;

const server = app.listen(port, '0.0.0.0', () => {
  logger.info('===========================================');
  logger.info(`        Bibboys YTrimmer Server v2.1`);
  logger.info('===========================================');
  logger.info(`Server running at: [suspicious link removed]:${port}`);
  logger.info(`Serving files from: ${path.join(__dirname, config.paths.public)}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info('===========================================');
  logger.info(' > COMMAND RUNNING :');
  logger.info('npm start       # Start production server');
  logger.info('npm run dev     # Start development server');
  logger.info('npm run trim    # CLI: single video trim');
  logger.info('npm run trimall # CLI: multiple video trims');
  logger.info('npm run clean   # Clean temp files');
  logger.info('npm run build   # Build Tailwind CSS');
  logger.info('===========================================');
  logger.info(` ✓ Rate Limiting (${config.rateLimit.max}/min)`);
  logger.info(` ✓ Max Duration: ${config.video.maxDurationSeconds / 60} minutes`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`ERROR: Port ${port} sudah digunakan!`);
    process.exit(1);
  }
});

module.exports = app;

// Handle server errors (like port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n\x1b[31m========================================\x1b[0m');
    console.error('\x1b[31m ERROR: Port ' + config.port + ' sudah digunakan!\x1b[0m');
    console.error('\x1b[31m========================================\x1b[0m');
    console.error('\n\x1b[33mSolusi:\x1b[0m');
    console.error('1. Jalankan: \x1b[36mnetstat -ano | findstr :' + config.port + '\x1b[0m');
    console.error('2. Cari PID di kolom terakhir');
    console.error('3. Jalankan: \x1b[36mtaskkill /F /PID <nomor_pid>\x1b[0m');
    console.error('\nAtau gunakan port lain di file .env:\n   PORT=3001\n');
    process.exit(1);
  } else {
    console.error('\n\x1b[31mServer Error:\x1b[0m', err.message);
    process.exit(1);
  }
});
