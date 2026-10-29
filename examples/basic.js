/**
 * Örnek: FTP sunucusunu programatik olarak başlat
 *
 * Çalıştır:
 *   npm run build
 *   npm start
 */
const { FtpServer } = require('../src/index.js');

const server = new FtpServer({
  port: 21,
  dataPort: 20,
  userFile: './users.json',
  maxConnections: 100,
  logLevel: 'info',

  // 220 karşılama mesajı (banner).
  // Boş bırakılırsa otomatik olarak "<port> FTP Server Ready" yazılır.
  banner: '',

  // PASV (pasif mod) veri bağlantı portları bu aralıktan seçilir.
  // Güvenlik duvarında açılması gereken aralıkla aynı olmalıdır.
  passivePortRange: { min: 50000, max: 50050 },
});

server.start();

module.exports = server;
