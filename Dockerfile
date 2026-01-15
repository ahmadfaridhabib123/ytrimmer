# Gunakan base image python
FROM python:3.10-slim

# Install ffmpeg dan Node.js (WAJIB agar yt-dlp bisa baca info YouTube)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp versi terbaru
RUN pip install --no-cache-dir yt-dlp

WORKDIR /app

# Install dependensi npm aplikasi kamu
COPY package*.json ./
RUN npm install

COPY . .

# Pastikan port menggunakan variable environment
ENV PORT=3000

CMD ["npm", "start"]