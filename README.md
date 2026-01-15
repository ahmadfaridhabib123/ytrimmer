<h1 align="center">🎬 Bibboy YTrimmer v2.1</h1>

<p align="center">
<strong>Download and trim sections of YouTube videos with a modern web UI</strong>
</p>

<p align="center">
<img src="https://img.shields.io/badge/node-%3E%3D16-brightgreen" alt="Node Version">
<img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
<img src="https://img.shields.io/badge/version-2.1.0-orange" alt="Version">
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
</p>

<p align="center">
<img src="https://i.gyazo.com/47d07ad7f425ccd747b4f6c3fb483e51.gif" alt="Demo">
</p>

## 📊 Project Statistics

<p align="center">
<img src="https://img.shields.io/github/languages/top/ahmadfaridhabib123/ytrimmer" alt="Top Language">
<img src="https://img.shields.io/github/languages/count/ahmadfaridhabib123/ytrimmer" alt="Language Count">
<img src="https://img.shields.io/github/repo-size/ahmadfaridhabib123/ytrimmer" alt="Repo Size">
<img src="https://img.shields.io/github/last-commit/ahmadfaridhabib123/ytrimmer" alt="Last Commit">
<img src="https://img.shields.io/github/commit-activity/m/ahmadfaridhabib123/ytrimmer" alt="Commit Activity">
</p>

---

## 📑 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [Configuration](#️-configuration)
- [API Endpoints](#️-api-endpoints)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [Roadmap](#️-roadmap)
- [License](#-license)

---

## ✨ Features

- 🎥 **Video Trimming** - Download specific sections of YouTube videos
- 🎵 **Audio Extraction** - Convert to MP3 format
- 📊 **Real-time Progress** - SSE-powered live updates
- 🔒 **Security** - URL sanitization, rate limiting, input validation
- 💾 **Disk Space Check** - Prevents server from running out of space
- 📝 **Proper Logging** - Winston-based structured logging
- 🌐 **Modern UI** - Beautiful, responsive web interface
- 🖥️ **CLI Mode** - Command-line interface for automation
- 📱 **Mobile Friendly** - Works perfectly on all devices
- 📜 **Download History** - Track your downloads with localStorage

---

## 🚀 Quick Start

### Prerequisites

Before you begin, make sure you have these installed:

<details>
<summary><b>📦 Node.js v16 or higher</b></summary>

**Download & Install:**
- Visit [nodejs.org](https://nodejs.org/)
- Download the LTS version
- Run the installer and follow the prompts

**Verify installation:**
```bash
node --version
npm --version
```
</details>

<details>
<summary><b>🎬 FFmpeg</b></summary>

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```
</details>

<details>
<summary><b>📥 yt-dlp</b></summary>

**Windows:**
```bash
# Using pip
pip install yt-dlp

# Or using Chocolatey
choco install yt-dlp
```

**macOS:**
```bash
brew install yt-dlp
```

**Linux:**
```bash
# Using pip
pip install yt-dlp

# Or using apt (Ubuntu/Debian)
sudo apt install yt-dlp
```

**Verify installation:**
```bash
yt-dlp --version
```
</details>

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/ahmadfaridhabib123/ytrimmer.git
cd ytrimmer

# 2. Install dependencies
npm install

# 3. Copy environment config
cp .env.example .env

# 4. (Optional) Edit .env file to customize settings
nano .env  # or use your preferred editor

# 5. Start the server
npm start
```

### 🎉 You're Ready!

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📖 Usage Guide

### 🌐 Web Interface (Recommended for Beginners)

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open your browser** and go to `http://localhost:3000`

3. **Paste YouTube URL**
   - Copy any YouTube video URL
   - Paste it in the input field
   - Click "Fetch Info" to preview

4. **Set Time Range**
   - Start time: When to begin trimming (e.g., `00:01:30`)
   - End time: When to stop trimming (e.g., `00:03:45`)
   - Format: `HH:mm:ss` or `mm:ss` or just `ss`

5. **Choose Settings**
   - **Format**: MP4 (video) or MP3 (audio only)
   - **Quality**: Best, High, Medium, or Low

6. **Click "Download & Trim"**
   - Watch the progress bar
   - File will download automatically when done

### 💻 CLI Mode - Single Cut

Perfect for automation and scripting:

```bash
npm run trim
```

You'll be prompted to enter:
- YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
- Start time (e.g., `1:30` or `00:01:30`)
- End time (e.g., `3:45` or `00:03:45`)
- Output filename (e.g., `my-video.mp4`)

### 🎯 CLI Mode - Multiple Cuts

For cutting multiple segments from the same video:

1. **Edit the configuration file:**
   ```bash
   nano src/actions/multiple-parts.js
   ```

2. **Set your parameters:**
   ```javascript
   const data = {
     url: 'https://www.youtube.com/watch?v=VIDEO_ID',
     intervals: [
       ['00:01:19', '00:01:40'],  // First segment
       ['00:04:30', '00:05:00'],  // Second segment
       ['00:08:00', '00:10:30']   // Third segment
     ],
     concat: true  // true = combine into one file, false = separate files
   }
   ```

3. **Run the command:**
   ```bash
   npm run trimall
   ```

---

## ⚙️ Configuration

Customize YTrimmer by editing the `.env` file:

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `PORT` | 3000 | Server port | `3000`, `8080` |
| `NODE_ENV` | development | Environment mode | `development`, `production` |
| `RATE_LIMIT_WINDOW` | 60000 | Rate limit window in milliseconds | `60000` (1 minute) |
| `RATE_LIMIT_MAX` | 10 | Max requests per window | `10`, `20` |
| `MAX_DURATION_SECONDS` | 600 | Max video duration (seconds) | `600` (10 min) |
| `MIN_DISK_SPACE_MB` | 1024 | Min free disk space (MB) | `1024` (1 GB) |
| `AUTO_DELETE_AFTER_DOWNLOAD` | true | Auto-cleanup files | `true`, `false` |

### Example .env file:

```env
PORT=3000
NODE_ENV=production
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=15
MAX_DURATION_SECONDS=1200
MIN_DISK_SPACE_MB=2048
AUTO_DELETE_AFTER_DOWNLOAD=true
```

---

## 🛠️ API Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/` | Web interface | - |
| `GET` | `/video-info` | Get video metadata | `url` (query) |
| `POST` | `/trim` | Start trim job | JSON body |
| `GET` | `/progress/:taskId` | SSE progress stream | `taskId` (path) |
| `GET` | `/download/:filename` | Download result | `filename` (path) |
| `GET` | `/health` | Health check | - |

### Example API Usage:

**Get video info:**
```bash
curl "http://localhost:3000/video-info?url=https://www.youtube.com/watch?v=VIDEO_ID"
```

**Start trim job:**
```bash
curl -X POST http://localhost:3000/trim \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "startTime": "00:01:00",
    "endTime": "00:02:00",
    "format": "mp4",
    "quality": "best"
  }'
```

**Check health:**
```bash
curl http://localhost:3000/health
```

---

## 📝 Examples

### Example 1: Download First 30 Seconds
```
URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Start: 00:00:00
End: 00:00:30
Format: MP4
Quality: Best
```

### Example 2: Extract Audio from Minute 2 to 5
```
URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Start: 00:02:00
End: 00:05:00
Format: MP3
Quality: Best
```

### Example 3: Trim Middle Section
```
URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Start: 00:05:30
End: 00:08:45
Format: MP4
Quality: High
```

### Example 4: Multiple Cuts (CLI)
```javascript
// src/actions/multiple-parts.js
const data = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  intervals: [
    ['00:00:10', '00:00:30'],  // Intro
    ['00:01:00', '00:02:00'],  // Main part
    ['00:03:30', '00:04:00']   // Outro
  ],
  concat: true  // Combine all parts
}
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

<details>
<summary><b>❌ "ffmpeg not found" error</b></summary>

**Problem:** FFmpeg is not installed or not in PATH.

**Solution:**
1. Install FFmpeg (see Prerequisites section)
2. Restart your terminal/command prompt
3. Verify: `ffmpeg -version`
4. If still not working, add FFmpeg to your system PATH manually
</details>

<details>
<summary><b>❌ "yt-dlp not found" error</b></summary>

**Problem:** yt-dlp is not installed or outdated.

**Solution:**
1. Install/Update yt-dlp:
   ```bash
   pip install -U yt-dlp
   ```
2. Verify: `yt-dlp --version`
3. Restart your terminal
</details>

<details>
<summary><b>❌ "Cannot download video" error</b></summary>

**Problem:** Video might be restricted or URL is invalid.

**Solution:**
1. Check if the video is available in your region
2. Make sure the URL is a valid YouTube URL
3. Try updating yt-dlp: `pip install -U yt-dlp`
4. Check if the video is age-restricted or private
</details>

<details>
<summary><b>❌ "Port already in use" error</b></summary>

**Problem:** Port 3000 is already being used by another application.

**Solution:**
1. Change the port in `.env` file:
   ```env
   PORT=8080
   ```
2. Or stop the other application using port 3000
3. Find what's using the port:
   - Windows: `netstat -ano | findstr :3000`
   - Mac/Linux: `lsof -i :3000`
</details>

<details>
<summary><b>❌ "Insufficient disk space" error</b></summary>

**Problem:** Not enough free disk space.

**Solution:**
1. Free up disk space
2. Change `MIN_DISK_SPACE_MB` in `.env` (not recommended)
3. Clean temporary files: `npm run clean`
</details>

<details>
<summary><b>❌ Video download is very slow</b></summary>

**Problem:** Slow internet or YouTube throttling.

**Solution:**
1. Check your internet connection
2. Try a lower quality setting
3. Use CLI mode for better performance
4. Avoid peak hours
</details>

<details>
<summary><b>❌ "Rate limit exceeded" error</b></summary>

**Problem:** Too many requests in a short time.

**Solution:**
1. Wait 1 minute and try again
2. Increase `RATE_LIMIT_MAX` in `.env` if you're the only user
3. Default is 10 requests per minute
</details>

---

## ❓ FAQ

<details>
<summary><b>Can I download entire playlists?</b></summary>

Currently, YTrimmer only supports single videos. Playlist support is planned for a future release.
</details>

<details>
<summary><b>What video formats are supported?</b></summary>

- **Video:** MP4 (H.264 codec)
- **Audio:** MP3 (192kbps or higher)
</details>

<details>
<summary><b>What is the maximum video duration I can trim?</b></summary>

Default is 10 minutes (600 seconds). You can change this in `.env`:
```env
MAX_DURATION_SECONDS=1200  # 20 minutes
```
</details>

<details>
<summary><b>Are downloaded files stored on the server?</b></summary>

By default, files are automatically deleted after download (if `AUTO_DELETE_AFTER_DOWNLOAD=true`). You can disable this in `.env`.
</details>

<details>
<summary><b>Can I use this commercially?</b></summary>

YTrimmer is MIT licensed, but you must:
- Respect YouTube's Terms of Service
- Respect copyright laws
- Not use it to redistribute copyrighted content
</details>

<details>
<summary><b>Does it work with private/unlisted videos?</b></summary>

No, YTrimmer can only access publicly available YouTube videos.
</details>

<details>
<summary><b>Can I run this on a VPS/Server?</b></summary>

Yes! Make sure to:
- Set `NODE_ENV=production` in `.env`
- Use a process manager like PM2
- Set up proper firewall rules
- Consider adding authentication for security
</details>

<details>
<summary><b>Why is the quality not as expected?</b></summary>

YouTube may not have the requested quality available. YTrimmer will automatically select the best available quality below your selection.
</details>

---

## 🔒 Security Features

- ✅ **URL Sanitization** - Only valid YouTube URLs accepted
- ✅ **Input Validation** - All inputs validated and sanitized
- ✅ **Rate Limiting** - Prevents abuse (10 requests/minute)
- ✅ **Max Duration** - 10 minute limit per download
- ✅ **Disk Space Check** - Prevents server crashes
- ✅ **Shell Injection Protection** - No shell metacharacters allowed
- ✅ **Filename Sanitization** - Safe output filenames
- ✅ **CORS Protection** - Configurable CORS policy

### 🔐 Security Best Practices

When deploying to production:

1. **Don't expose to public internet without authentication**
2. **Use HTTPS** with a valid SSL certificate
3. **Set strong rate limits** in `.env`
4. **Regular updates:** Keep yt-dlp and dependencies updated
5. **Monitor disk usage** and set up alerts
6. **Use environment variables** for sensitive data
7. **Enable firewall** and restrict access by IP if possible

---

## 📁 Project Structure

```
ytrimmer/
├── public/                 # Frontend files
│   ├── index.html         # Main web interface
│   ├── main.js            # Frontend JavaScript
│   └── style.css          # Tailwind CSS output
├── src/
│   ├── actions/           # CLI action scripts
│   │   ├── one-part.js    # Single trim action
│   │   └── multiple-parts.js  # Multiple trim action
│   ├── config/            # Configuration module
│   │   └── index.js       # Environment config
│   ├── robots/            # Core utilities
│   │   └── ytrimmer.js    # Main trimming logic
│   ├── server/            # Express server
│   │   └── index.js       # Server setup & routes
│   └── utils/             # Utility functions
│       ├── logger.js      # Winston logger
│       └── validators.js  # Input validation
├── logs/                  # Log files (auto-generated)
├── temp/                  # Temporary download files
├── .env                   # Environment config (create from .env.example)
├── .env.example           # Example environment config
├── .gitignore            # Git ignore rules
├── package.json          # Node.js dependencies
└── README.md             # This file
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm run trim` | CLI: Trim single video segment |
| `npm run trimall` | CLI: Trim multiple video segments |
| `npm run clean` | Clean temporary files |
| `npm run build` | Build Tailwind CSS |
| `npm test` | Run tests (if available) |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### How to Contribute

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ytrimmer.git
   cd ytrimmer
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```

4. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments where necessary
   - Test your changes

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add some AmazingFeature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/AmazingFeature
   ```

7. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Describe your changes

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

### What to Contribute

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Tests
- 🌍 Translations

---

## 🗺️ Roadmap

### Recently Completed ✅

- ✅ **Docker support** - Easy deployment with Docker
- ✅ Environment configuration (.env)
- ✅ Winston logging with file rotation
- ✅ Disk space checking
- ✅ Input length validation
- ✅ Download history (localStorage)
- ✅ Periodic cleanup of temp files
- ✅ Improved security with centralized validators

### Planned Features 🚀

- [ ] 📑 **Playlist support** - Download and trim entire playlists
- [ ] 📦 **Batch download** - Queue multiple videos
- [ ] 🔐 **User authentication** - Secure multi-user access
- [ ] 📊 **Download queue system** - Better handling of concurrent downloads
- [ ] 🎬 **Multiple quality downloads** - Download same video in different qualities
- [ ] 🌍 **Internationalization** - Multi-language support
- [ ] 📱 **Mobile app** - Native iOS and Android apps
- [ ] ☁️ **Cloud storage integration** - Save directly to Google Drive, Dropbox, etc.
- [ ] 🎨 **Custom themes** - Dark/light mode and custom color schemes
- [ ] 📈 **Analytics dashboard** - Track download statistics
- [ ] 🔔 **Notifications** - Email/push notifications when download completes
- [ ] 🎯 **Smart trimming** - AI-powered scene detection for better cuts

---

## ⚡ Performance Tips

### For Better Performance

1. **Use SSD for temp directory**
   - Faster read/write speeds
   - Better for concurrent downloads

2. **Increase RAM**
   - Minimum: 2GB
   - Recommended: 4GB or more

3. **For high traffic**
   - Use Redis for rate limiting
   - Implement load balancing
   - Use CDN for static files

4. **Production deployment**
   - Enable compression in nginx
   - Use PM2 for process management
   - Set up monitoring (e.g., Prometheus)

5. **Network optimization**
   - Use wired connection instead of WiFi
   - Ensure stable internet connection
   - Consider using a VPN if YouTube is throttled

---

## 🌐 Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start src/server/index.js --name ytrimmer

# Save the process list
pm2 save

# Set up auto-start on system boot
pm2 startup
```

### Using Docker (Coming Soon)

```dockerfile
# Dockerfile will be added in future releases
```

### Deploying to VPS

1. **Install Node.js, ffmpeg, and yt-dlp**
2. **Clone and setup:**
   ```bash
   git clone https://github.com/ahmadfaridhabib123/ytrimmer.git
   cd ytrimmer
   npm install
   cp .env.example .env
   nano .env  # Configure for production
   ```
3. **Setup PM2:**
   ```bash
   pm2 start src/server/index.js --name ytrimmer
   pm2 save
   pm2 startup
   ```
4. **Setup nginx as reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 📊 Logging

YTrimmer uses Winston for structured logging:

- **Location:** `logs/` directory
- **Files:**
  - `error.log` - Error logs only
  - `combined.log` - All logs
- **Rotation:** Automatic log rotation (max 20MB per file)
- **Retention:** Keeps last 14 days of logs

### Log Levels

- `error` - Error messages
- `warn` - Warning messages
- `info` - Informational messages
- `debug` - Debug messages (development only)

---

## 🙏 Credits

- **Original project by** [Bibboy](https://github.com/ahmadfaridhabib123)
- **Powered by:**
  - [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloading
  - [ffmpeg](https://ffmpeg.org/) - Video processing
  - [Express.js](https://expressjs.com/) - Web framework
  - [Tailwind CSS](https://tailwindcss.com/) - UI styling
  - [Winston](https://github.com/winstonjs/winston) - Logging

### Special Thanks

- All contributors who have helped improve this project
- The open-source community for amazing tools and libraries

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:

- ✅ You can use this project for personal use
- ✅ You can use this project for commercial use
- ✅ You can modify the code
- ✅ You can distribute the code
- ❗ You must include the license and copyright notice
- ❗ The software is provided "as is", without warranty

---

## 📞 Support

Need help? Here's how to get support:

1. **Check the FAQ** - Most common questions are answered there
2. **Check Troubleshooting** - Common issues and solutions
3. **Search Issues** - Someone might have had the same problem
4. **Open an Issue** - If you found a bug or have a feature request
5. **Discussions** - For general questions and discussions

### Useful Links

- 📚 [Documentation](https://github.com/ahmadfaridhabib123/ytrimmer/wiki)
- 🐛 [Report a Bug](https://github.com/ahmadfaridhabib123/ytrimmer/issues/new)
- 💡 [Request a Feature](https://github.com/ahmadfaridhabib123/ytrimmer/issues/new)
- 💬 [Discussions](https://github.com/ahmadfaridhabib123/ytrimmer/discussions)

---

## ⭐ Show Your Support

If you find this project useful, please consider:

- ⭐ **Starring the repository** on GitHub
- 🐦 **Sharing it** on social media
- 🤝 **Contributing** to the project
- ☕ **Buying me a coffee** (if donation link available)

---

<p align="center">
Made with ❤️ by <a href="https://github.com/ahmadfaridhabib123">Bibboy</a>
</p>

<p align="center">
<sub>Happy Trimming! 🎬✂️</sub>
</p>
