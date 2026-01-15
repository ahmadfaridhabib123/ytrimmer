FROM node:18-slim

# Install FFmpeg untuk proses potong video
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Railway menggunakan PORT 3000 sesuai input kamu tadi
EXPOSE 3000

CMD ["node", "src/server/server.js"]
