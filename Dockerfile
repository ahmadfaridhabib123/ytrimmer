# Gunakan base image python (karena yt-dlp butuh python)
FROM python:3.10-slim

# Install ffmpeg dan Node.js (untuk yt-dlp runtime)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp terbaru
RUN pip install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy package.json dan install dependensi npm
COPY package*.json ./
RUN npm install

# Copy semua file aplikasi
COPY . .

# Jalankan aplikasi
CMD ["npm", "start"]