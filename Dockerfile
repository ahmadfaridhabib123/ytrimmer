FROM node:18-slim

# Install FFmpeg dan Python untuk downloader
RUN apt-get update && apt-get install -y ffmpeg python3 curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package files dulu agar install lebih cepat
COPY package*.json ./
RUN npm install --production

# Copy semua file project
COPY . .

# Pastikan Railway tahu portnya
ENV PORT=3000
EXPOSE 3000

# Gunakan npm start agar membaca script dari package.json kamu
CMD ["npm", "start"]
