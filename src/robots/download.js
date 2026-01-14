const { execSync } = require('child_process');
const readline = require('readline-sync');

// Fungsi konversi waktu ke detik
function timeToSeconds(timeString) {
  if (!timeString) return 0;
  const parts = timeString.toString().split(':');
  let seconds = 0;
  let multiplier = 1;
  while (parts.length > 0) {
    seconds += multiplier * parseInt(parts.pop(), 10);
    multiplier *= 60;
  }
  return seconds;
}

async function download(content) {
  console.log('\n=======================================');
  console.log('🎬 YT-Trimmer CLI Mode');
  console.log('=======================================\n');

  // Ambil waktu dari input (konsisten dengan input.js)
  let startTime = content.start;
  let endTime = content.end;

  // Fallback jika kosong
  if (!startTime) {
    startTime = readline.question('⚠️ Waktu Mulai (contoh 00:01:30): ');
  }
  if (!endTime) {
    endTime = readline.question('⚠️ Waktu Selesai (contoh 00:02:00): ');
  }

  // Hitung durasi
  const startSec = timeToSeconds(startTime);
  const endSec = timeToSeconds(endTime);
  const duration = endSec - startSec;

  // Validasi Durasi
  if (duration <= 0) {
    console.error(`❌ Durasi tidak valid (${duration} detik). Waktu selesai harus lebih besar dari waktu mulai.`);
    return;
  }

  // Nama file
  let fileName = content.filename || 'video_potong';
  if (!fileName.endsWith('.mp4')) fileName += '.mp4';

  console.log(`📋 URL: ${content.url}`);
  console.log(`⏱️  Waktu: ${startTime} → ${endTime} (${duration} detik)`);
  console.log(`📁 Output: ${fileName}\n`);

  try {
    console.log('🔍 Mengambil stream URL...');

    // Dapatkan direct URL untuk video dan audio stream
    const videoUrl = execSync(`yt-dlp -f "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=1080]/best[height<=1080]" -g "${content.url}"`, { shell: true }).toString().trim();
    const audioUrl = execSync(`yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -g "${content.url}"`, { shell: true }).toString().trim();

    console.log('✅ Stream URL didapat');
    console.log('⏳ Memproses dengan FFmpeg...\n');

    // FFmpeg: -ss sebelum -i untuk input seeking (lebih cepat)
    // -t duration untuk durasi output
    const command = `ffmpeg -ss ${startTime} -i "${videoUrl}" -ss ${startTime} -i "${audioUrl}" -t ${duration} -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -avoid_negative_ts make_zero -y "${fileName}"`;

    execSync(command, { stdio: 'inherit', shell: true });

    console.log(`\n✅ SUKSES! File disimpan: ${fileName}`);
    console.log('=======================================\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

module.exports = download;
