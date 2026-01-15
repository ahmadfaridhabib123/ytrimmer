# Gunakan base image Node.js langsung agar runtime tersedia
FROM node:18-slim

# Install Python, FFmpeg, dan dependencies sistem lainnya
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp versi terbaru menggunakan pip
RUN pip3 install --no-cache-dir yt-dlp --break-system-packages

# Set folder kerja
WORKDIR /app

# Copy file package.json dan install library Node.js
COPY package*.json ./
RUN npm install

# Copy semua file project
COPY . .

# Set environment variable untuk port
ENV PORT=3000
ENV NODE_ENV=production

# Jalankan server
CMD ["node", "src/server/server.js"]