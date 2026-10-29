/**
 * Manuel FTP İstemcisi - FTP Sunucusunu Test Et
 * 
 * Kullanım: node test/ftp-client.js
 */

const net = require('net');

/**
 * FTP İstemcisi class
 */
class FtpClient {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 21;
    this.username = options.username || 'admin';
    this.password = options.password || 'admin123';
    this.socket = null;
    this.connected = false;
    this.logged = false;
    this.currentDir = '';
  }

  /**
   * FTP sunucusuna bağlan
   */
  connect() {
    console.log(`\n[+] Bağlanılıyor: ${this.host}:${this.port}`);
    
    this.socket = net.createConnection(this.port, this.host, () => {
      this.connected = true;
      console.log(`[+] Bağlantı kuruldu: ${this.host}:${this.port}`);
      this.socket.on('data', (data) => {
        this.handleData(data.toString());
      });
      this.socket.on('end', () => {
        console.log('[x] Bağlantı kapatıldı');
        this.connected = false;
      });
      this.socket.on('error', (err) => {
        console.error(`[x] Bağlantı hatası: ${err.message}`);
        this.connected = false;
      });
    });

    this.socket.setTimeout(30000);
    return this;
  }

  /**
   * Gelen veriyi işle
   */
  handleData(data) {
    const lines = data.trim().split('\r\n');
    
    lines.forEach((line) => {
      const parts = line.split(' ', 2);
      const code = parseInt(parts[0], 10);
      const message = parts.length > 1 ? parts[1] : '';
      
      console.log(`[${code}] ${message}`);

      // Komut sonuçlarını işle (yanıt koduna göre; metin eşleşmesi güvenilir değil)
      if (code === 331) {
        // Sunucu şifre istiyor; PASS daha sonra login() tarafından gönderilir
        console.log('[+] Sunucu şifre istedi');
      } else if (code === 230) {
        this.logged = true;
        this.currentDir = '/';
        console.log('[+] Kullanıcı giriş başarılı: ' + this.username);
      } else if (code === 221) {
        console.log('[x] Sunucu bağlantıyı kapatıyor...');
        this.disconnect();
      } else if (code === 421) {
        console.log('[x] Sunucu zaman aşımı veya hata');
        this.disconnect();
      }
    });
  }

  /**
   * Komut gönder
   */
  sendCommand(command) {
    if (!this.connected) {
      console.log('[x] Bağlantı yok - bağlanmayı dene');
      return;
    }

    console.log(`> ${command}`);
    this.socket.write(command + '\r\n');
  }

  /**
   * Bağlantıyı kapat
   */
  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
  }

  /**
   * Kullanıcı girişi
   */
  login() {
    if (!this.logged) {
      this.sendCommand('USER ' + this.username);
    }
    return this;
  }

  /**
   * Şifre girişi
   */
  pass() {
    if (!this.logged) {
      this.sendCommand('PASS ' + this.password);
    }
    return this;
  }

  /**
   * Dizin listele
   */
  list() {
    if (this.logged) {
      this.sendCommand('LIST');
    } else {
      console.log('[x] Önce giriş yap');
    }
    return this;
  }

  /**
   * Aktuel dizin
   */
  pwd() {
    if (this.logged) {
      this.sendCommand('PWD');
    } else {
      console.log('[x] Önce giriş yap');
    }
    return this;
  }

  /**
   * Dizin değiştir
   */
  cwd(dir) {
    if (this.logged) {
      this.sendCommand('CWD ' + dir);
    } else {
      console.log('[x] Önce giriş yap');
    }
    return this;
  }

  /**
   * Dosya indir (RETR) - TODO: Implement
   */
  retr(filename) {
    if (this.logged) {
      this.sendCommand('RETR ' + filename);
    } else {
      console.log('[x] Önce giriş yap');
    }
    return this;
  }

  /**
   * Dosya yükle (STOR) - TODO: Implement
   */
  stor(filename) {
    if (this.logged) {
      this.sendCommand('STOR ' + filename);
    } else {
      console.log('[x] Önce giriş yap');
    }
    return this;
  }

  /**
   * Dosya sil (DELE) - TODO: Implement
   */
  dele(filename) {
    if (this.logged) {
      this.sendCommand('DELE ' + filename);
    } else {
      console.log('[x] Önce giriş yap');
    }
    return this;
  }

  /**
   * QUIT
   */
  quit() {
    if (this.logged) {
      this.sendCommand('QUIT');
    } else {
      this.disconnect();
    }
  }

  /**
   * NOOP
   */
  noop() {
    this.sendCommand('NOOP');
    return this;
  }
}

/**
 * Test senaryoları
 */
async function runTests() {
  console.log('==========================================');
  console.log('    FTP SUNUCU TEST İSTEMCİSİ');
  console.log('==========================================');

  const client = new FtpClient({
    host: 'localhost',
    port: 21,
    username: 'admin',
    password: 'admin123',
  });

  // Test 1: Bağlan
  console.log('\n[TEST 1] Bağlan');
  client.connect();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Giriş yap
  console.log('\n[TEST 2] Giriş yap');
  client.login().pass();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Aktuel dizin
  console.log('\n[TEST 3] Aktuel dizin');
  client.pwd();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 4: Listele
  console.log('\n[TEST 4] Dizin listele');
  client.list();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 5: NOOP
  console.log('\n[TEST 5] NOOP komutu');
  client.noop();
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 6: QUIT
  console.log('\n[TEST 6] Çıkış');
  client.quit();
}

// Testleri çalıştır
runTests().catch(console.error);

/**
 * Manuel komut satırı modu
 */
function interactiveMode() {
  console.log('\n==========================================');
  console.log('    MANUEL FTP İSTEMCİSİ (Komut Satırı)');
  console.log('==========================================');
  console.log('Komutlar: connect, login, pwd, list, noop, quit');
  console.log('Çıkmak için: quit\n');

  const client = new FtpClient();
  let connected = false;
  let logged = false;

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (data) => {
    const command = data.trim().toLowerCase();

    switch (command) {
      case 'connect':
        connected = true;
        client.connect();
        break;
      case 'login':
        logged = true;
        client.login().pass();
        break;
      case 'pwd':
        if (connected && logged) client.pwd();
        else console.log('[x] Önce bağlan ve giriş yap');
        break;
      case 'list':
        if (connected && logged) client.list();
        else console.log('[x] Önce bağlan ve giriş yap');
        break;
      case 'noop':
        if (connected && logged) client.noop();
        else console.log('[x] Önce bağlan ve giriş yap');
        break;
      case 'quit':
        client.quit();
        process.exit(0);
        break;
      default:
        if (connected && logged) {
          client.sendCommand(command);
        } else {
          console.log('[x] Önce bağlan ve giriş yap');
        }
    }
  });
}

// Komut satırı argümanları
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveMode();
} else {
  runTests();
}