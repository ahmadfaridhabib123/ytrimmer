# Gunakan Node.js versi terbaru
FROM node:18-alpine

# Set folder kerja di dalam container
WORKDIR /app

# Copy package.json dan install dependencies
COPY package*.json ./
RUN npm install

# Copy seluruh file project
COPY . .

# Beritahu port yang digunakan (sesuai port Express Anda)
EXPOSE 3000

# Jalankan server
CMD ["node", "src/server/index.js"]
