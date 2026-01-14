// YouTube Trimmer v2.1 - Main JavaScript File
console.log('✅ Main.js v2.1 loaded successfully!');

// ===========================================
// CONSTANTS
// ===========================================
const MAX_URL_LENGTH = 200;
const MAX_FILENAME_LENGTH = 50;
const MAX_TIME_LENGTH = 20;
const HISTORY_KEY = 'yt_trimmer_history';
const MAX_HISTORY_ITEMS = 10;

// ===========================================
// DOM ELEMENTS
// ===========================================
let submitBtn, resetBtn, statusMessage, urlInput, startInput, endInput, filenameInput;
let formatRadios, qualitySelect, qualityContainer;
let videoPreview, videoPreviewLoading, videoThumbnail, videoTitle, videoUploader, videoDurationBadge, videoViewsBadge, videoViews;
let progressContainer, progressBar, progressStatus, progressPercent, progressMessage;

// Multi-trim elements
let modeSingleBtn, modeMultiBtn, singleTrimContainer, multiTrimContainer;
let intervalList, addIntervalBtn, concatOption;

// Current task tracking
let currentTaskId = null;
let eventSource = null;

// Multi-trim state
let currentMode = 'single'; // 'single' or 'multi'
let intervals = []; // Array of {start, end} objects
let intervalCounter = 0;

// ===========================================
// INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM loaded, initializing...');
  initElements();
  attachEventListeners();
  console.log('✅ Application ready!');
});

function initElements() {
  // Form elements
  submitBtn = document.getElementById('submit-btn');
  resetBtn = document.getElementById('reset-btn');
  statusMessage = document.getElementById('status-message');
  urlInput = document.getElementById('url');
  startInput = document.getElementById('start');
  endInput = document.getElementById('end');
  filenameInput = document.getElementById('filename');

  // Format and quality
  formatRadios = document.querySelectorAll('input[name="format"]');
  qualitySelect = document.getElementById('quality');
  qualityContainer = document.getElementById('quality-container');

  // Video preview
  videoPreview = document.getElementById('video-preview');
  videoPreviewLoading = document.getElementById('video-preview-loading');
  videoThumbnail = document.getElementById('video-thumbnail');
  videoTitle = document.getElementById('video-title');
  videoUploader = document.getElementById('video-uploader').querySelector('span');
  videoDurationBadge = document.getElementById('video-duration-badge');
  videoViewsBadge = document.getElementById('video-views-badge');
  videoViews = document.getElementById('video-views');

  // Progress bar
  progressContainer = document.getElementById('progress-container');
  progressBar = document.getElementById('progress-bar');
  progressStatus = document.getElementById('progress-status');
  progressPercent = document.getElementById('progress-percent');
  progressMessage = document.getElementById('progress-message');

  // Multi-trim elements
  modeSingleBtn = document.getElementById('mode-single');
  modeMultiBtn = document.getElementById('mode-multi');
  singleTrimContainer = document.getElementById('single-trim-container');
  multiTrimContainer = document.getElementById('multi-trim-container');
  intervalList = document.getElementById('interval-list');
  addIntervalBtn = document.getElementById('add-interval-btn');
  concatOption = document.getElementById('concat-option');

  // Check if all elements exist
  if (!submitBtn || !statusMessage || !urlInput) {
    console.error('❌ Some DOM elements not found!');
    return;
  }

  // Initialize multi-trim with first interval
  if (intervalList) {
    addInterval();
  }

  console.log('✅ All DOM elements found');
}

function attachEventListeners() {
  // Submit button
  submitBtn.addEventListener('click', handleSubmit);

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }

  // URL input - fetch video info on blur or paste
  urlInput.addEventListener('blur', debounce(handleUrlChange, 500));
  urlInput.addEventListener('paste', () => {
    setTimeout(() => handleUrlChange(), 100);
  });

  // Format radio change - show/hide quality selector
  formatRadios.forEach(radio => {
    radio.addEventListener('change', handleFormatChange);
  });

  // Mode toggle listeners
  if (modeSingleBtn) {
    modeSingleBtn.addEventListener('click', () => setMode('single'));
  }
  if (modeMultiBtn) {
    modeMultiBtn.addEventListener('click', () => setMode('multi'));
  }

  // Add interval button
  if (addIntervalBtn) {
    addIntervalBtn.addEventListener('click', addInterval);
  }

  // Auto-focus on first input
  urlInput.focus();

  console.log('✅ Event listeners attached');
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function truncateInput(input, maxLength) {
  if (input && input.value.length > maxLength) {
    input.value = input.value.substring(0, maxLength);
  }
}

function validateInputLengths() {
  truncateInput(urlInput, MAX_URL_LENGTH);
  truncateInput(filenameInput, MAX_FILENAME_LENGTH);
  truncateInput(startInput, MAX_TIME_LENGTH);
  truncateInput(endInput, MAX_TIME_LENGTH);
}

// Download history functions
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function addToHistory(item) {
  try {
    const history = getHistory();
    history.unshift({
      ...item,
      timestamp: new Date().toISOString()
    });
    // Keep only last N items
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Could not save to history:', e);
  }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

function showStatus(type, message) {
  if (!statusMessage) return;

  statusMessage.classList.remove('hidden');

  let bgClass, borderClass, textClass, icon;

  if (type === 'success') {
    bgClass = 'bg-green-50';
    borderClass = 'border-green-200';
    textClass = 'text-green-800';
    icon = `
      <svg class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `;
  } else if (type === 'error') {
    bgClass = 'bg-red-50';
    borderClass = 'border-red-200';
    textClass = 'text-red-800';
    icon = `
      <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `;
  } else {
    bgClass = 'bg-blue-50';
    borderClass = 'border-blue-200';
    textClass = 'text-blue-800';
    icon = `
      <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
    `;
  }

  statusMessage.className = `rounded-xl p-4 flex items-start gap-3 border ${bgClass} ${borderClass}`;
  statusMessage.innerHTML = `
    ${icon}
    <div class="text-sm ${textClass}">${message}</div>
  `;
}

function hideStatus() {
  if (statusMessage) {
    statusMessage.classList.add('hidden');
  }
}

// ===========================================
// VIDEO INFO / PREVIEW
// ===========================================

async function handleUrlChange() {
  // Validate input length
  validateInputLengths();

  const url = urlInput.value.trim();

  if (!url) {
    videoPreview.classList.add('hidden');
    return;
  }

  // Check URL length
  if (url.length > MAX_URL_LENGTH) {
    showStatus('error', `URL terlalu panjang (max ${MAX_URL_LENGTH} karakter)`);
    return;
  }

  // Simple YouTube URL check
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!youtubeRegex.test(url)) {
    return;
  }

  console.log('🔍 Fetching video info for:', url);

  // Show loading skeleton
  videoPreviewLoading.classList.remove('hidden');
  videoPreview.classList.add('hidden');

  try {
    const response = await fetch(`/video-info?url=${encodeURIComponent(url)}`);
    const result = await response.json();

    if (result.success && result.data) {
      const data = result.data;

      // Update preview elements
      videoThumbnail.src = data.thumbnail;
      videoThumbnail.alt = data.title;
      videoTitle.textContent = data.title;
      videoUploader.textContent = data.uploader;
      videoDurationBadge.textContent = data.durationFormatted;
      videoViews.textContent = formatNumber(data.viewCount);

      // Show preview, hide skeleton
      videoPreviewLoading.classList.add('hidden');
      videoPreview.classList.remove('hidden');

      console.log('✅ Video info loaded:', data.title);
    } else {
      throw new Error(result.message || 'Failed to fetch video info');
    }
  } catch (error) {
    console.error('❌ Error fetching video info:', error);
    videoPreviewLoading.classList.add('hidden');
    // Don't show error, just hide preview
  }
}

// ===========================================
// FORMAT CHANGE
// ===========================================

function handleFormatChange() {
  const selectedFormat = document.querySelector('input[name="format"]:checked').value;

  if (selectedFormat === 'mp3') {
    qualityContainer.classList.add('hidden');
  } else {
    qualityContainer.classList.remove('hidden');
  }
}

// ===========================================
// PROGRESS BAR & SSE
// ===========================================

function showProgress() {
  progressContainer.classList.remove('hidden');
  hideStatus();
}

function hideProgress() {
  progressContainer.classList.add('hidden');
}

function updateProgress(data) {
  progressBar.style.width = `${data.progress}%`;
  progressPercent.textContent = `${data.progress}%`;
  progressStatus.textContent = data.status === 'downloading' ? 'Mengunduh Video...' :
    data.status === 'trimming' ? 'Memotong Video...' :
      data.status === 'cleaning' ? 'Membersihkan...' :
        data.status === 'complete' ? 'Selesai!' :
          data.status === 'error' ? 'Error!' : 'Memproses...';
  progressMessage.textContent = data.message || '';

  // Change color on complete
  if (data.status === 'complete') {
    progressBar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
  } else if (data.status === 'error') {
    progressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  }
}

function connectToProgress(taskId) {
  console.log('📡 Connecting to progress stream:', taskId);

  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`/progress/${taskId}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📊 Progress update:', data);
      updateProgress(data);

      if (data.status === 'complete' && data.filename) {
        // Success! Trigger download
        setTimeout(() => {
          triggerDownload(data.filename);
        }, 500);

        eventSource.close();
        eventSource = null;
      } else if (data.status === 'error') {
        showStatus('error', data.message || 'Terjadi kesalahan');
        eventSource.close();
        eventSource = null;
        resetButton();
      }
    } catch (e) {
      console.error('Error parsing progress:', e);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
    eventSource.close();
    eventSource = null;
  };
}

// ===========================================
// DOWNLOAD TRIGGER
// ===========================================

function triggerDownload(filename) {
  console.log('📥 Triggering download for:', filename);

  showStatus('success', `Video berhasil diproses! Mengunduh "${filename}"...`);

  // Save to history
  addToHistory({
    filename,
    url: urlInput.value.trim(),
    start: startInput.value.trim(),
    end: endInput.value.trim(),
    format: document.querySelector('input[name="format"]:checked')?.value || 'mp4'
  });

  // Create a hidden link and click it
  const link = document.createElement('a');
  link.href = `/download/${encodeURIComponent(filename)}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Reset button after short delay
  setTimeout(() => {
    resetButton();
    hideProgress();
  }, 2000);
}

// ===========================================
// FORM SUBMISSION
// ===========================================

async function handleSubmit() {
  console.log('🚀 Submit button clicked');

  // Check mode and redirect to appropriate handler
  if (currentMode === 'multi') {
    return handleMultiSubmit();
  }

  const url = urlInput.value.trim();
  const start = startInput.value.trim();
  const end = endInput.value.trim();
  const filename = filenameInput.value.trim() || 'video-part';
  const format = document.querySelector('input[name="format"]:checked').value;
  const quality = qualitySelect.value;

  console.log('📝 Form data:', { url, start, end, filename, format, quality });

  // Validation
  if (!url || !start || !end) {
    showStatus('error', 'Harap isi semua field yang diperlukan (URL, Waktu Mulai, dan Waktu Selesai)');
    return;
  }

  // Validate YouTube URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!youtubeRegex.test(url)) {
    showStatus('error', 'URL tidak valid. Harap masukkan URL YouTube yang valid.');
    return;
  }

  // Validate time format
  const timeRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}(\.\d+)?$/;
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    showStatus('error', 'Format waktu tidak valid. Gunakan format HH:mm:ss atau mm:ss');
    return;
  }

  console.log('✅ Validation passed');

  // Disable button during processing
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    Memproses...
  `;

  // Show progress bar
  showProgress();
  updateProgress({ status: 'starting', progress: 0, message: 'Mengirim request...' });

  try {
    console.log('📡 Sending request to server...');

    const response = await fetch('/trim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        start,
        end,
        filename,
        format,
        quality
      })
    });

    console.log('📥 Response received:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Result:', result);

    if (result.success && result.taskId) {
      currentTaskId = result.taskId;
      connectToProgress(result.taskId);
    } else {
      throw new Error(result.message || 'Unknown error occurred');
    }

  } catch (error) {
    console.error('❌ Error during processing:', error);

    let errorMessage = error.message;

    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Tidak dapat terhubung ke server. Pastikan server berjalan dengan perintah "npm start"';
    } else if (error.message.includes('429')) {
      errorMessage = 'Terlalu banyak request. Silakan tunggu 1 menit.';
    }

    showStatus('error', `Terjadi kesalahan: ${errorMessage}`);
    hideProgress();
    resetButton();
  }
}

// ===========================================
// RESET
// ===========================================

function resetButton() {
  submitBtn.disabled = false;
  submitBtn.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
    </svg>
    Download & Trim
  `;
}

function handleReset() {
  // Reset form values
  urlInput.value = '';
  startInput.value = '00:00:00';
  endInput.value = '00:00:00';
  filenameInput.value = '';
  document.getElementById('format-mp4').checked = true;
  qualitySelect.value = '720';
  qualityContainer.classList.remove('hidden');

  // Hide preview and messages
  videoPreview.classList.add('hidden');
  videoPreviewLoading.classList.add('hidden');
  hideStatus();
  hideProgress();

  // Reset progress bar style
  progressBar.style.width = '0%';
  progressBar.style.background = '';

  // Close SSE connection
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  // Reset button
  resetButton();

  // Focus on URL input
  urlInput.focus();

  console.log('🔄 Form reset');
}

// ===========================================
// MULTI-TRIM FUNCTIONS
// ===========================================

/**
 * Switch between single and multi trim mode
 */
function setMode(mode) {
  currentMode = mode;
  console.log('🔄 Mode changed to:', mode);

  if (mode === 'single') {
    // Update button styles
    modeSingleBtn.classList.add('border-red-500', 'bg-red-50', 'text-red-700');
    modeSingleBtn.classList.remove('border-gray-200');
    modeMultiBtn.classList.remove('border-red-500', 'bg-red-50', 'text-red-700');
    modeMultiBtn.classList.add('border-gray-200');

    // Show/hide containers
    singleTrimContainer.classList.remove('hidden');
    multiTrimContainer.classList.add('hidden');
  } else {
    // Update button styles
    modeMultiBtn.classList.add('border-red-500', 'bg-red-50', 'text-red-700');
    modeMultiBtn.classList.remove('border-gray-200');
    modeSingleBtn.classList.remove('border-red-500', 'bg-red-50', 'text-red-700');
    modeSingleBtn.classList.add('border-gray-200');

    // Show/hide containers
    singleTrimContainer.classList.add('hidden');
    multiTrimContainer.classList.remove('hidden');
  }
}

/**
 * Add a new interval to the multi-trim list
 */
function addInterval() {
  intervalCounter++;
  const intervalId = `interval-${intervalCounter}`;

  const intervalDiv = document.createElement('div');
  intervalDiv.id = intervalId;
  intervalDiv.className = 'flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl';
  intervalDiv.innerHTML = `
    <span class="text-sm font-medium text-gray-500 w-8">#${intervals.length + 1}</span>
    <div class="flex-1 grid grid-cols-2 gap-3">
      <div class="relative">
        <input type="text" class="interval-start w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" 
          value="00:00:00" placeholder="Mulai">
      </div>
      <div class="relative">
        <input type="text" class="interval-end w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" 
          value="00:00:00" placeholder="Selesai">
      </div>
    </div>
    <button type="button" class="remove-interval-btn p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-id="${intervalId}">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  `;

  intervalList.appendChild(intervalDiv);

  // Add to intervals array
  intervals.push({ id: intervalId, start: '00:00:00', end: '00:00:00' });

  // Attach remove listener
  intervalDiv.querySelector('.remove-interval-btn').addEventListener('click', () => {
    removeInterval(intervalId);
  });

  // Attach input change listeners
  intervalDiv.querySelector('.interval-start').addEventListener('change', (e) => {
    const interval = intervals.find(i => i.id === intervalId);
    if (interval) interval.start = e.target.value;
  });
  intervalDiv.querySelector('.interval-end').addEventListener('change', (e) => {
    const interval = intervals.find(i => i.id === intervalId);
    if (interval) interval.end = e.target.value;
  });

  console.log('➕ Interval added:', intervalId);
  updateIntervalNumbers();
}

/**
 * Remove an interval from the multi-trim list
 */
function removeInterval(intervalId) {
  // Don't allow removing the last interval
  if (intervals.length <= 1) {
    showStatus('error', 'Minimal harus ada 1 interval');
    return;
  }

  const element = document.getElementById(intervalId);
  if (element) {
    element.remove();
  }

  intervals = intervals.filter(i => i.id !== intervalId);
  console.log('➖ Interval removed:', intervalId);
  updateIntervalNumbers();
}

/**
 * Update interval numbers after add/remove
 */
function updateIntervalNumbers() {
  const intervalDivs = intervalList.querySelectorAll('[id^="interval-"]');
  intervalDivs.forEach((div, index) => {
    const numberSpan = div.querySelector('span');
    if (numberSpan) {
      numberSpan.textContent = `#${index + 1}`;
    }
  });
}

/**
 * Get all intervals from the form
 */
function getIntervalsFromForm() {
  const result = [];
  const intervalDivs = intervalList.querySelectorAll('[id^="interval-"]');

  intervalDivs.forEach(div => {
    const start = div.querySelector('.interval-start').value.trim();
    const end = div.querySelector('.interval-end').value.trim();
    if (start && end) {
      result.push([start, end]);
    }
  });

  return result;
}

/**
 * Handle multi-trim form submission
 */
async function handleMultiSubmit() {
  console.log('🚀 Multi-trim submit clicked');

  const url = urlInput.value.trim();
  const filename = filenameInput.value.trim() || 'video-multi';
  const format = document.querySelector('input[name="format"]:checked').value;
  const quality = qualitySelect.value;
  const concat = concatOption ? concatOption.checked : false;
  const formIntervals = getIntervalsFromForm();

  console.log('📝 Multi-trim data:', { url, filename, format, quality, concat, intervals: formIntervals });

  // Validation
  if (!url) {
    showStatus('error', 'Harap masukkan URL YouTube');
    return;
  }

  if (formIntervals.length === 0) {
    showStatus('error', 'Harap tambahkan minimal 1 interval waktu');
    return;
  }

  // Validate each interval
  const timeRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}(\.?\d+)?$/;
  for (let i = 0; i < formIntervals.length; i++) {
    const [start, end] = formIntervals[i];
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      showStatus('error', `Format waktu tidak valid pada interval #${i + 1}`);
      return;
    }
  }

  // Disable button during processing
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    Memproses ${formIntervals.length} interval...
  `;

  showProgress();
  updateProgress({ status: 'starting', progress: 0, message: 'Mengirim request multi-trim...' });

  try {
    const response = await fetch('/multi-trim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        intervals: formIntervals,
        filename,
        format,
        quality,
        concat
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Multi-trim result:', result);

    if (result.success && result.taskId) {
      currentTaskId = result.taskId;
      connectToProgress(result.taskId);
    } else {
      throw new Error(result.message || 'Unknown error occurred');
    }

  } catch (error) {
    console.error('❌ Error during multi-trim:', error);
    showStatus('error', `Terjadi kesalahan: ${error.message}`);
    hideProgress();
    resetButton();
  }
}

console.log('📄 Main.js v2.1 with Multi-Trim loaded completely');
