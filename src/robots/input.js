const readline = require('readline-sync')

module.exports = () => ({
  url: readline.question('URL YouTube: '),
  start: readline.question('Waktu Mulai (contoh 00:01:30): '),
  end: readline.question('Waktu Selesai (contoh 00:02:00): '),
  filename: readline.question('Nama File (default: video_potong): ') || 'video_potong'
})
