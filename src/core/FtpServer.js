"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FtpServer = void 0;
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const userManager_1 = require("../userManager");
const logger_1 = require("../utils/logger");
const Commands = __importStar(require("../commands"));
const DEFAULT_CONFIG = {
    port: 21,
    dataPort: 20,
    userFile: path.join(__dirname, '../users.json'),
    maxConnections: 100,
    logLevel: 'info',
    banner: '',
    passivePortRange: { min: 50000, max: 50050 },
};
class FtpServer {
    constructor(config = {}) {
        this.server = null;
        this.dataServer = null;
        this.connections = new Map();
        this.dataConnections = new Map();
        this.userManager = null;
        this.connectionCount = 0;
        this.passiveMode = false;
        this.passiveIp = '127.0.0.1';
        this.passiveDataServer = null;
        this.passiveDataPort = 50000;
        this.passivePortCursor = 0;
        this.pendingListData = null;
        this.pendingListConnId = null;
        this.pendingRetrFile = null;
        this.pendingRetrConnId = null;
        this.pendingStorFile = null;
        this.pendingStorConnId = null;
        this.inputBuffers = new Map();
        this.commandQueues = new Map();
        this.pendingDataSocket = null;
        this.passiveConnId = null;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.maxConnections = this.config.maxConnections || DEFAULT_CONFIG.maxConnections;
        const banner = typeof this.config.banner === 'string' ? this.config.banner.trim() : '';
        this.config.banner = banner !== '' ? banner : `${this.config.port} FTP Server Ready`;
        this.config.passivePortRange = this.normalizePortRange(this.config.passivePortRange);
        let logLevelEnum = logger_1.LogLevel.INFO;
        if (this.config.logLevel === 'debug') {
            logLevelEnum = logger_1.LogLevel.DEBUG;
        }
        else if (this.config.logLevel === 'warn') {
            logLevelEnum = logger_1.LogLevel.WARN;
        }
        else if (this.config.logLevel === 'error') {
            logLevelEnum = logger_1.LogLevel.ERROR;
        }
        logger_1.Logger.setLevel(logLevelEnum);
        this.userManager = new userManager_1.UserManager(this.config.userFile);
        logger_1.Logger.info(`[FtpServer] FTP Sunucusu başlatılıyor...`);
        logger_1.Logger.info(`[FtpServer] Kontrol portu: ${this.config.port}`);
        logger_1.Logger.info(`[FtpServer] Veri portu: ${this.config.dataPort}`);
        logger_1.Logger.info(`[FtpServer] Maksimum bağlantı: ${this.maxConnections}`);
        logger_1.Logger.info(`[FtpServer] Banner: ${this.config.banner}`);
        logger_1.Logger.info(`[FtpServer] PASV port aralığı: ${this.config.passivePortRange.min}-${this.config.passivePortRange.max}`);
    }
    normalizePortRange(range) {
        const fallback = { ...DEFAULT_CONFIG.passivePortRange };
        if (!range) {
            return fallback;
        }
        const min = Math.floor(Number(range.min));
        const max = Math.floor(Number(range.max));
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max > 65535 || min > max) {
            logger_1.Logger.warn(`[FtpServer] Geçersiz PASV port aralığı: ${range.min}-${range.max}, varsayılan ${fallback.min}-${fallback.max} kullanılacak`);
            return fallback;
        }
        return { min, max };
    }
    nextPassivePort() {
        const { min, max } = this.config.passivePortRange;
        const span = max - min + 1;
        const port = min + (this.passivePortCursor % span);
        this.passivePortCursor = (this.passivePortCursor + 1) % span;
        return port;
    }
    async ensurePassiveListener(port) {
        if (this.passiveDataServer && this.passiveDataServer.listening && this.passiveDataPort === port) {
            return true;
        }
        if (this.passiveDataServer) {
            const oldServer = this.passiveDataServer;
            this.passiveDataServer = null;
            oldServer.close();
        }
        const server = net.createServer((dataSocket) => {
            const ownerId = this.passiveConnId || '';
            logger_1.Logger.info(`[FtpServer] Pasif data bağlantısı kuruldu: port ${port} (${ownerId})`);
            this.handlePassiveDataConnection(dataSocket, ownerId);
        });
        return new Promise((resolve) => {
            server.once('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Pasif port ${port} açılamadı: ${err.message}`);
                resolve(false);
            });
            server.listen(port, () => {
                this.passiveDataServer = server;
                this.passiveDataPort = port;
                logger_1.Logger.info(`[FtpServer] Pasif data sunucusu başlatıldı: port ${port}`);
                resolve(true);
            });
        });
    }
    start() {
        try {
            this.server = net.createServer((socket) => {
                this.handleConnection(socket);
            });
            this.server.listen(this.config.port, () => {
                logger_1.Logger.info(`[+] FTP sunucusu başlatıldı: http://localhost:${this.config.port}`);
                logger_1.Logger.info(`[+] Kullanıcı bilgileri: ${this.config.userFile}`);
                logger_1.Logger.info(`[+] Komutlar: USER, PASS, CWD, PWD, LIST, RETR, STOR, DELE, QUIT, NOOP`);
            });
            this.server.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Sunucu hatası: ${err.message}`);
            });
            this.server.on('close', () => {
                logger_1.Logger.info(`[FtpServer] FTP sunucusu kapandı`);
            });
            this.dataServer = net.createServer((dataSocket) => {
                this.handleDataConnection(dataSocket);
            });
            this.dataServer.listen(this.config.dataPort, () => {
                logger_1.Logger.info(`[+] Data sunucusu başlatıldı: port ${this.config.dataPort}`);
            });
            this.dataServer.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Data sunucu hatası: ${err.message}`);
            });
        }
        catch (error) {
            logger_1.Logger.error('[FtpServer] Başlatma hatası:', error);
        }
    }
    handleConnection(socket) {
        const connId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logger_1.Logger.info(`[FtpServer] Yeni bağlantı: ${connId} (IP: ${socket.remoteAddress})`);
        if (this.connectionCount >= this.maxConnections) {
            socket?.write(`503 Service not available\r\n`);
            socket.end();
            return;
        }
        this.connectionCount++;
        const connection = {
            socket,
            user: null,
            pass: null,
            homeDir: '',
            currentDir: '',
            permissions: {},
            transferMode: null,
            transferSize: 0,
            lastReply: 0,
            lastMessage: '',
        };
        this.connections.set(connId, connection);
        socket?.write(`220 ${this.config.banner}\r\n`);
        socket.on('data', (data) => {
            this.handleControlData(connId, data);
        });
        socket.on('error', (err) => {
            logger_1.Logger.error(`[FtpServer] Bağlantı hatası (${connId}): ${err.message}`);
            this.closeConnection(connId, 'error');
        });
        socket.on('close', () => {
            logger_1.Logger.info(`[FtpServer] Bağlantı kapandı: ${connId}`);
            this.closeConnection(connId);
        });
        socket.on('timeout', () => {
            logger_1.Logger.info(`[FtpServer] Bağlantı zaman aşımı: ${connId}`);
            this.closeConnection(connId, 'timeout');
        });
    }
    handleControlData(connId, data) {
        const buffer = (this.inputBuffers.get(connId) || '') + data.toString('utf-8');
        const lines = buffer.split(/\r\n|\n|\r/);
        this.inputBuffers.set(connId, lines.pop() ?? '');
        for (const line of lines) {
            this.enqueueCommand(connId, line);
        }
    }
    enqueueCommand(connId, line) {
        const previous = this.commandQueues.get(connId) || Promise.resolve();
        const next = previous
            .then(() => this.processCommand(connId, line))
            .catch((err) => logger_1.Logger.error(`[FtpServer] Komut işlenemedi (${connId}):`, err));
        this.commandQueues.set(connId, next);
    }
    async processCommand(connId, rawLine) {
        try {
            const conn = this.connections.get(connId);
            const socket = conn?.socket;
            if (!conn) {
                logger_1.Logger.error(`[FtpServer] Bağlantı bulunamadı: ${connId}`);
                return;
            }
            const line = rawLine.trim();
            if (line === '') {
                return;
            }
            const separatorIndex = line.search(/\s/);
            const command = (separatorIndex === -1 ? line : line.slice(0, separatorIndex)).toUpperCase();
            const args = separatorIndex === -1 ? '' : line.slice(separatorIndex).trim();
            logger_1.Logger.info(`[FtpServer] Komut: ${command} (conn: ${connId})`);
            if (command === 'USER') {
                await Commands.handleUser(connId, conn, args, this.userManager);
            }
            else if (command === 'PASS') {
                await Commands.handlePass(connId, conn, args, this.userManager);
            }
            else if (command === 'QUIT') {
                await Commands.handleQuit(connId, conn, (id, reason) => this.closeConnection(id, reason));
            }
            else if (command === 'NOOP') {
                await Commands.handleNoop(connId, conn);
            }
            else if (command === 'PWD') {
                await Commands.handlePwd(connId, conn);
            }
            else if (command === 'CWD') {
                await Commands.handleCwd(connId, conn, args, this.userManager);
            }
            else if (command === 'LIST' || command === 'NLST') {
                const listResult = await Commands.handleList(connId, conn, this.userManager, socket);
                const resultObj = listResult;
                if (resultObj && resultObj.data && typeof resultObj.data === 'object' && resultObj.data !== null) {
                    const listData = resultObj.data;
                    this.pendingListData = listData.output;
                    this.pendingListConnId = connId;
                    logger_1.Logger.info(`[FtpServer] LIST data bekleniyor: ${listData.output ? listData.output.length : 0} bytes`);
                    this.ensureDataConnection(connId);
                }
            }
            else if (command === 'RETR') {
                const retrResult = await Commands.handleRetr(connId, conn, args, this.userManager, socket);
                const resultObj = retrResult;
                if (resultObj && resultObj.data && typeof resultObj.data === 'object' && resultObj.data !== null) {
                    const retrData = resultObj.data;
                    this.pendingRetrFile = retrData.filePath;
                    this.pendingRetrConnId = connId;
                    logger_1.Logger.info(`[FtpServer] RETR dosya bekleniyor: ${retrData.filePath}`);
                    this.ensureDataConnection(connId);
                }
            }
            else if (command === 'STOR') {
                const storResult = await Commands.handleStor(connId, conn, args, this.userManager, socket);
                const resultObj = storResult;
                if (resultObj && resultObj.data && typeof resultObj.data === 'object' && resultObj.data !== null) {
                    const storData = resultObj.data;
                    this.pendingStorFile = storData.filePath;
                    this.pendingStorConnId = connId;
                    logger_1.Logger.info(`[FtpServer] STOR dosya bekleniyor: ${storData.filePath}`);
                    this.ensureDataConnection(connId);
                }
            }
            else if (command === 'DELE') {
                await Commands.handleDele(connId, conn, args, this.userManager);
            }
            else if (command === 'PASV') {
                this.passiveConnId = connId;
                this.clearPendingTransfers(connId);
                const port = this.nextPassivePort();
                const listening = await this.ensurePassiveListener(port);
                if (listening) {
                    await Commands.handlePasv(connId, conn, this.passiveIp, port);
                }
                else {
                    socket?.write(`425 Cannot open data connection\r\n`);
                }
            }
            else if (command === 'PORT') {
                await Commands.handlePort(conn, args);
            }
            else if (command === 'FEAT') {
                await Commands.handleFeat(connId, conn);
            }
            else if (command === 'SYST') {
                await Commands.handleSyst(connId, conn);
            }
            else if (command === 'TYPE') {
                await Commands.handleType(conn, args);
            }
            else if (command === 'MKD') {
                await Commands.handleMkd(connId, conn, args, this.userManager);
            }
            else if (command === 'RMD') {
                await Commands.handleRmd(connId, conn, args, this.userManager);
            }
            else if (command === 'RNFR') {
                await Commands.handleRnfr(connId, conn, args, this.userManager);
            }
            else if (command === 'RNTO') {
                await Commands.handleRnto(connId, conn, args, this.userManager);
            }
            else {
                socket?.write(`502 Command not implemented: ${command}\r\n`);
            }
        }
        catch (error) {
            logger_1.Logger.error(`[FtpServer] Veri işleme hatası (${connId}):`, error);
            const conn = this.connections.get(connId);
            const socket = conn?.socket;
            socket?.write(`500 Internal server error\r\n`);
        }
    }
    handleDataConnection(socket) {
        logger_1.Logger.info(`[FtpServer] Data bağlantısı kuruldu`);
        socket.on('data', (data) => {
        });
        socket.on('error', (err) => {
            logger_1.Logger.error(`[FtpServer] Data bağlantı hatası: ${err.message}`);
        });
        socket.on('close', () => {
            logger_1.Logger.info(`[FtpServer] Data bağlantısı kapandı`);
        });
    }
    handlePassiveDataConnection(socket, connId) {
        logger_1.Logger.info(`[FtpServer] Data bağlantısı kabul edildi: ${connId}`);
        socket.on('error', (err) => {
            logger_1.Logger.error(`[FtpServer] Data bağlantı hatası: ${err.message}`);
            if (this.pendingDataSocket === socket) {
                this.pendingDataSocket = null;
            }
            socket.destroy();
        });
        socket.on('close', () => {
            if (this.pendingDataSocket === socket) {
                this.pendingDataSocket = null;
            }
        });
        if (this.pendingDataSocket && this.pendingDataSocket !== socket && !this.pendingDataSocket.destroyed) {
            this.pendingDataSocket.destroy();
        }
        this.pendingDataSocket = socket;
        this.tryServeData();
    }
    ensureDataConnection(connId) {
        if (this.pendingDataSocket && !this.pendingDataSocket.destroyed) {
            this.tryServeData();
            return;
        }
        const conn = this.connections.get(connId);
        if (!conn || conn.dataMode !== 'active' || !conn.activeDataTarget) {
            return;
        }
        const target = conn.activeDataTarget;
        const socket = net.createConnection(target.port, target.ip, () => {
            logger_1.Logger.info(`[FtpServer] Aktif data bağlantısı kuruldu: ${target.ip}:${target.port}`);
            this.handlePassiveDataConnection(socket, connId);
        });
        socket.on('error', (err) => {
            logger_1.Logger.error(`[FtpServer] Aktif data bağlantı hatası: ${err.message}`);
            if (this.pendingDataSocket === socket) {
                this.pendingDataSocket = null;
            }
            socket.destroy();
        });
    }
    tryServeData() {
        const socket = this.pendingDataSocket;
        if (!socket || socket.destroyed) {
            return;
        }
        if (this.pendingListData !== null && this.pendingListConnId !== null) {
            const data = this.pendingListData;
            const connId = this.pendingListConnId;
            this.pendingListData = null;
            this.pendingListConnId = null;
            this.pendingDataSocket = null;
            logger_1.Logger.info(`[FtpServer] LIST data gönderiliyor: ${data.length} bytes`);
            socket.once('finish', () => {
                this.writeControl(connId, types_1.ReplyCode.LIST_END, 'Directory listing complete');
            });
            socket.write(data, () => socket.end());
            return;
        }
        if (this.pendingRetrFile !== null && this.pendingRetrConnId !== null) {
            const file = this.pendingRetrFile;
            const connId = this.pendingRetrConnId;
            this.pendingRetrFile = null;
            this.pendingRetrConnId = null;
            this.pendingDataSocket = null;
            logger_1.Logger.info(`[FtpServer] RETR dosya gönderiliyor: ${file}`);
            const readStream = fs.createReadStream(file);
            readStream.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] RETR okuma hatası: ${err.message}`);
                this.writeControl(connId, types_1.ReplyCode.FILE_NOT_FOUND, 'Cannot read file');
                socket.destroy();
            });
            socket.once('finish', () => {
                this.writeControl(connId, types_1.ReplyCode.RETR_OK, 'Retr complete');
            });
            readStream.pipe(socket);
            return;
        }
        if (this.pendingStorFile !== null && this.pendingStorConnId !== null) {
            const file = this.pendingStorFile;
            const connId = this.pendingStorConnId;
            this.pendingStorFile = null;
            this.pendingStorConnId = null;
            this.pendingDataSocket = null;
            logger_1.Logger.info(`[FtpServer] STOR dosya alınıyor: ${file}`);
            const writeStream = fs.createWriteStream(file);
            writeStream.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] STOR yazma hatası: ${err.message}`);
                this.writeControl(connId, types_1.ReplyCode.INTERNAL_ERR, 'Cannot write file');
                socket.destroy();
            });
            writeStream.on('finish', () => {
                this.writeControl(connId, types_1.ReplyCode.STOR_OK, 'Stor complete');
            });
            socket.pipe(writeStream);
            return;
        }
    }
    clearPendingTransfers(connId) {
        if (this.pendingListConnId === connId) {
            this.pendingListData = null;
            this.pendingListConnId = null;
        }
        if (this.pendingRetrConnId === connId) {
            this.pendingRetrFile = null;
            this.pendingRetrConnId = null;
        }
        if (this.pendingStorConnId === connId) {
            this.pendingStorFile = null;
            this.pendingStorConnId = null;
        }
    }
    writeControl(connId, code, message) {
        const conn = this.connections.get(connId);
        if (conn && conn.socket) {
            conn.lastReply = code;
            conn.lastMessage = message;
            conn.socket.write(`${code} ${message}` + '\r\n');
        }
    }
    closeConnection(connId, reason) {
        this.inputBuffers.delete(connId);
        this.commandQueues.delete(connId);
        this.clearPendingTransfers(connId);
        if (this.passiveConnId === connId) {
            this.passiveConnId = null;
        }
        const conn = this.connections.get(connId);
        if (conn) {
            conn.socket?.end();
            this.connections.delete(connId);
            this.connectionCount--;
            if (reason) {
                logger_1.Logger.info(`[FtpServer] Bağlantı kapatıldı: ${connId} (seçenek: ${reason})`);
            }
            else {
                logger_1.Logger.info(`[FtpServer] Bağlantı kapatıldı: ${connId}`);
            }
        }
    }
}
exports.FtpServer = FtpServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnRwU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvRnRwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLEdBQUcsZ0NBQVk7QUFDM0IsTUFBWSxJQUFJLGlDQUFhO0FBQzdCLG9DQUFpRjtBQUNqRixnREFBNkM7QUFFN0MsNENBQW1EO0FBQ25ELE1BQVksUUFBUSx3Q0FBb0I7QUFLeEMsTUFBTSxjQUFjLEdBQWlCO0lBQ25DLElBQUksRUFBRSxFQUFFO0lBQ1IsUUFBUSxFQUFFLEVBQUU7SUFDWixRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDO0lBQy9DLGNBQWMsRUFBRSxHQUFHO0lBQ25CLFFBQVEsRUFBRSxNQUFNO0lBRWhCLE1BQU0sRUFBRSxFQUFFO0lBRVYsZ0JBQWdCLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7Q0FDN0MsQ0FBQztBQUtGO0lBOEJFLFlBQVksTUFBTSxHQUFtQyxFQUFFO1FBN0IvQyxXQUFNLEdBQXNCLElBQUksQ0FBQztRQUNqQyxlQUFVLEdBQXNCLElBQUksQ0FBQztRQUNyQyxnQkFBVyxHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3BELG9CQUFlLEdBQXFCLElBQUksR0FBRyxFQUFFLENBQUM7UUFFOUMsZ0JBQVcsR0FBdUIsSUFBSSxDQUFDO1FBQ3ZDLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO1FBRTVCLGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBQzdCLGNBQVMsR0FBVyxXQUFXLENBQUM7UUFDaEMsc0JBQWlCLEdBQXNCLElBQUksQ0FBQztRQUM1QyxvQkFBZSxHQUFXLEtBQUssQ0FBQztRQUVoQyxzQkFBaUIsR0FBVyxDQUFDLENBQUM7UUFDOUIsb0JBQWUs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LEdBQUcsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QixJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNYLGVBQU0sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLE1BQU0sY0FBYyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ2hGLENBQUM7aUJBQU0sQ0FBQztnQkFDTixlQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzNELENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgbmV0IGZyb20gJ25ldCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0LCBTZXJ2ZXJDb25maWcgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBVc2VyTWFuYWdlciB9IGZyb20gJy4uL3VzZXJNYW5hZ2VyJztcbmltcG9ydCB7IG5vcm1hbGl6ZURpclBhdGgsIGVuc3VyZURpcmVjdG9yeUV4aXN0cyB9IGZyb20gJy4uL3V0aWxzL3BhdGhVdGlscyc7XG5pbXBvcnQgeyBMb2dnZXIsIExvZ0xldmVsIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcbmltcG9ydCAqIGFzIENvbW1hbmRzIGZyb20gJy4uL2NvbW1hbmRzJztcblxuLyoqXG4gKiBEZWZhdWx0IGF5YXJsYXJcbiAqL1xuY29uc3QgREVGQVVMVF9DT05GSUc6IFNlcnZlckNvbmZpZyA9IHtcbiAgcG9ydDogMjEsXG4gIGRhdGFQb3J0OiAyMCxcbiAgdXNlckZpbGU6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi91c2Vycy5qc29uJyksXG4gIG1heENvbm5lY3Rpb25zOiAxMDAsXG4gIGxvZ0xldmVsOiAnaW5mbycsXG4gIC8vIDIyMCBrYXLFn8SxbGFtYSBtZXNhasSxOyBib8WfIGLEsXJha8SxbMSxcnNhIFwiPHBvcnQ+IEZUUCBTZXJ2ZXIgUmVhZHlcIiDDvHJldGlsaXJcbiAgYmFubmVyOiAnJyxcbiAgLy8gUEFTViB2ZXJpIGJhxJ9sYW50xLEgcG9ydGxhcsSxIGJ1IGFyYWzEsWt0YW4gc2XDp2lsaXJcbiAgcGFzc2l2ZVBvcnRSYW5nZTogeyBtaW46IDUwMDAwLCBtYXg6IDUwMDUwIH0sXG59O1xuXG4vKipcbiAqIEZUUCBTdW51Y3VzdSBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgRnRwU2VydmVyIHtcbiAgcHJpdmF0ZSBzZXJ2ZXI6IG5ldC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkYXRhU2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGlvbnM6IE1hcDxzdHJpbmcsIEZ0cENvbm5lY3Rpb24+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGRhdGFDb25uZWN0aW9uczogTWFwPHN0cmluZywgYW55PiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBjb25maWc6IHR5cGVvZiBERUZBVUxUX0NPTkZJRztcbiAgcHJpdmF0ZSB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uQ291bnQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgbWF4Q29ubmVjdGlvbnM6IG51bWJlcjtcbiAgcHJpdmF0ZSBwYXNzaXZlTW9kZTogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIHBhc3NpdmVJcDogc3RyaW5nID0gJzEyNy4wLjAuMSc7XG4gIHByaXZhdGUgcGFzc2l2ZURhdGFTZXJ2ZXI6IG5ldC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwYXNzaXZlRGF0YVBvcnQ6IG51bWJlciA9IDUwMDAwO1xuICAvKiogUEFTViBwb3J0IGFyYWzEscSfxLEgw7x6ZXJpbmRlIGRvbGHFn2FuIGltbGXDpyAqL1xuICBwcml2YXRlIHBhc3NpdmVQb3J0Q3Vyc29yOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIHBlbmRpbmdMaXN0RGF0YTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ0xpc3RDb25uSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdSZXRyRmlsZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1JldHJDb25uSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdTdG9yRmlsZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1N0b3JDb25uSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAvKiogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgZ2VsZW4geWFyxLFtICh0YW1hbWxhbm1hbcSxxZ8pIGtvbXV0IHNhdMSxcmxhcsSxICovXG4gIHByaXZhdGUgaW5wdXRCdWZmZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpO1xuICAvKiogQmHEn2xhbnTEsSBiYcWfxLFuYSBrb211dGxhcsSxbiBzxLFyYXlsYSBpxZ9sZW5tZXNpIGnDp2luIGt1eXJ1ayAqL1xuICBwcml2YXRlIGNvbW1hbmRRdWV1ZXM6IE1hcDxzdHJpbmcsIFByb21pc2U8dm9pZD4+ID0gbmV3IE1hcCgpO1xuICAvKiogSGVuw7x6IGt1bGxhbsSxbG1hbcSxxZ8gcGFzaWYvYWt0aWYgZGF0YSBiYcSfbGFudMSxc8SxICovXG4gIHByaXZhdGUgcGVuZGluZ0RhdGFTb2NrZXQ6IG5ldC5Tb2NrZXQgfCBudWxsID0gbnVsbDtcbiAgLyoqIFNvbiBQQVNWIGtvbXV0dW51IHZlcmVuIGJhxJ9sYW50xLEgKGRhdGEgYmHEn2xhbnTEsXPEsSBzYWhpYmkpICovXG4gIHByaXZhdGUgcGFzc2l2ZUNvbm5JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBQYXJ0aWFsPHR5cGVvZiBERUZBVUxUX0NPTkZJRz4gPSB7fSkge1xuICAgIHRoaXMuY29uZmlnID0geyAuLi5ERUZBVUxUX0NPTkZJRywgLi4uY29uZmlnIH0gYXMgU2VydmVyQ29uZmlnO1xuICAgIHRoaXMubWF4Q29ubmVjdGlvbnMgPSB0aGlzLmNvbmZpZy5tYXhDb25uZWN0aW9ucyB8fCBERUZBVUxUX0NPTkZJRy5tYXhDb25uZWN0aW9ucztcblxuICAgIC8vIEJhbm5lcjogYm/FnyBixLFyYWvEsWzEsXJzYSBcIjxwb3J0PiBGVFAgU2VydmVyIFJlYWR5XCJcbiAgICBjb25zdCBiYW5uZXIgPSB0eXBlb2YgdGhpcy5jb25maWcuYmFubmVyID09PSAnc3RyaW5nJyA/IHRoaXMuY29uZmlnLmJhbm5lci50cmltKCkgOiAnJztcbiAgICB0aGlzLmNvbmZpZy5iYW5uZXIgPSBiYW5uZXIgIT09ICcnID8gYmFubmVyIDogYCR7dGhpcy5jb25maWcucG9ydH0gRlRQIFNlcnZlciBSZWFkeWA7XG5cbiAgICAvLyBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYVxuICAgIHRoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2UgPSB0aGlzLm5vcm1hbGl6ZVBvcnRSYW5nZSh0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlKTtcbiAgICAvLyBMb2dnZXIgc2V2aXllc2luaSBheWFybGFcbiAgICBsZXQgbG9nTGV2ZWxFbnVtOiBMb2dMZXZlbCA9IExvZ0xldmVsLklORk87XG4gICAgaWYgKHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSAnZGVidWcnKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5ERUJVRztcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSAnd2FybicpIHtcbiAgICAgIGxvZ0xldmVsRW51bSA9IExvZ0xldmVsLldBUk47XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5sb2dMZXZlbCA9PT0gJ2Vycm9yJykge1xuICAgICAgbG9nTGV2ZWxFbnVtID0gTG9nTGV2ZWwuRVJST1I7XG4gICAgfVxuICAgIExvZ2dlci5zZXRMZXZlbChsb2dMZXZlbEVudW0pO1xuICAgIC8vIFVzZXJNYW5hZ2VyJ8SxIGJhxZ9sYXRcbiAgICB0aGlzLnVzZXJNYW5hZ2VyID0gbmV3IFVzZXJNYW5hZ2VyKHRoaXMuY29uZmlnLnVzZXJGaWxlKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRlRQIFN1bnVjdXN1IGJhxZ9sYXTEsWzEsXlvci4uLmApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBLb250cm9sIHBvcnR1OiAke3RoaXMuY29uZmlnLnBvcnR9YCk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFZlcmkgcG9ydHU6ICR7dGhpcy5jb25maWcuZGF0YVBvcnR9YCk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIE1ha3NpbXVtIGJhxJ9sYW50xLE6ICR7dGhpcy5tYXhDb25uZWN0aW9uc31gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQmFubmVyOiAke3RoaXMuY29uZmlnLmJhbm5lcn1gKTtcbiAgICBMb2dnZXIuaW5mbyhcbiAgICAgIGBbRnRwU2VydmVyXSBQQVNWIHBvcnQgYXJhbMSxxJ/EsTogJHt0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlLm1pbn0tJHt0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlLm1heH1gXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYTsgZ2XDp2Vyc2l6c2UgdmFyc2F5xLFsYW4gYXJhbMSxxJ9hIGTDtm5cbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplUG9ydFJhbmdlKHJhbmdlOiB7IG1pbj86IG51bWJlcjsgbWF4PzogbnVtYmVyIH0gfCB1bmRlZmluZWQpOiB7IG1pbjogbnVtYmVyOyBtYXg6IG51bWJlciB9IHtcbiAgICBjb25zdCBmYWxsYmFjayA9IHsgLi4uREVGQVVMVF9DT05GSUcucGFzc2l2ZVBvcnRSYW5nZSB9O1xuICAgIGlmICghcmFuZ2UpIHtcbiAgICAgIHJldHVybiBmYWxsYmFjaztcbiAgICB9XG4gICAgY29uc3QgbWluID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWluKSk7XG4gICAgY29uc3QgbWF4ID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWF4KSk7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobWluKSB8fCAhTnVtYmVyLmlzRmluaXRlKG1heCkgfHwgbWluIDwgMSB8fCBtYXggPiA2NTUzNSB8fCBtaW4gPiBtYXgpIHtcbiAgICAgIExvZ2dlci53YXJuKFxuICAgICAgICBgW0Z0cFNlcnZlcl0gR2XDp2Vyc2l6IFBBU1YgcG9ydCBhcmFsxLHEn8SxOiAke3JhbmdlLm1pbn0tJHtyYW5nZS5tYXh9LCB2YXJzYXnEsWxhbiAke2ZhbGxiYWNrLm1pbn0tJHtmYWxsYmFjay5tYXh9IGt1bGxhbsSxbGFjYWtgXG4gICAgICApO1xuICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4geyBtaW4sIG1heCB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFlhcMSxbGFuZMSxcsSxbGFuIFBBU1YgcG9ydCBhcmFsxLHEn8SxbmRhbiBzxLFyYXlsYSAoeXV2YXJsYWsgdXN1bCkgYmlyIHBvcnQgc2XDp1xuICAgKi9cbiAgcHJpdmF0ZSBuZXh0UGFzc2l2ZVBvcnQoKTogbnVtYmVyIHtcbiAgICBjb25zdCB7IG1pbiwgbWF4IH0gPSB0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlO1xuICAgIGNvbnN0IHNwYW4gPSBtYXggLSBtaW4gKyAxO1xuICAgIGNvbnN0IHBvcnQgPSBtaW4gKyAodGhpcy5wYXNzaXZlUG9ydEN1cnNvciAlIHNwYW4pO1xuICAgIHRoaXMucGFzc2l2ZVBvcnRDdXJzb3IgPSAodGhpcy5wYXNzaXZlUG9ydEN1cnNvciArIDEpICUgc3BhbjtcbiAgICByZXR1cm4gcG9ydDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQQVNWIHBvcnR1bnUgZGlubGVtZXllIGFsIChkaW5sZXlpY2kgemF0ZW4gbyBwb3J0dGF5c2EgeWVuaWRlbiBrdXJ1bG1heikuXG4gICAqIDIyNyB5YW7EsXTEsSBhbmNhayBwb3J0IGdlcsOnZWt0ZW4gZGlubGVkaWt0ZW4gc29ucmEgZ8O2bmRlcmlsaXIuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGVuc3VyZVBhc3NpdmVMaXN0ZW5lcihwb3J0OiBudW1iZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5wYXNzaXZlRGF0YVNlcnZlciAmJiB0aGlzLnBhc3NpdmVEYXRhU2VydmVyLmxpc3RlbmluZyAmJiB0aGlzLnBhc3NpdmVEYXRhUG9ydCA9PT0gcG9ydCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRXNraSBkaW5sZXlpY2l5aSBrYXBhdCAoa2FidWwgZWRpbG1pxZ8gdmVyaSBiYcSfbGFudMSxbGFyxLEgZXRraWxlbm1leilcbiAgICBpZiAodGhpcy5wYXNzaXZlRGF0YVNlcnZlcikge1xuICAgICAgY29uc3Qgb2xkU2VydmVyID0gdGhpcy5wYXNzaXZlRGF0YVNlcnZlcjtcbiAgICAgIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIgPSBudWxsO1xuICAgICAgb2xkU2VydmVyLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoZGF0YVNvY2tldCkgPT4ge1xuICAgICAgY29uc3Qgb3duZXJJZCA9IHRoaXMucGFzc2l2ZUNvbm5JZCB8fCAnJztcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBQYXNpZiBkYXRhIGJhxJ9sYW50xLFzxLEga3VydWxkdTogcG9ydCAke3BvcnR9ICgke293bmVySWR9KWApO1xuICAgICAgdGhpcy5oYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oZGF0YVNvY2tldCwgb3duZXJJZCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICAgIHNlcnZlci5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBQYXNpZiBwb3J0ICR7cG9ydH0gYcOnxLFsYW1hZMSxOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiB7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIgPSBzZXJ2ZXI7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFQb3J0ID0gcG9ydDtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc2lmIGRhdGEgc3VudWN1c3UgYmHFn2xhdMSxbGTEsTogcG9ydCAke3BvcnR9YCk7XG4gICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGVFAgc3VudWN1c3VudSBiYcWfbGF0XG4gICAqL1xuICBwdWJsaWMgc3RhcnQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoc29ja2V0KSA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlQ29ubmVjdGlvbihzb2NrZXQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc2VydmVyLmxpc3Rlbih0aGlzLmNvbmZpZy5wb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbK10gRlRQIHN1bnVjdXN1IGJhxZ9sYXTEsWxkxLE6IGh0dHA6Ly9sb2NhbGhvc3Q6JHt0aGlzLmNvbmZpZy5wb3J0fWApO1xuICAgICAgICBMb2dnZXIuaW5mbyhgWytdIEt1bGxhbsSxY8SxIGJpbGdpbGVyaTogJHt0aGlzLmNvbmZpZy51c2VyRmlsZX1gKTtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFsrXSBLb211dGxhcjogVVNFUiwgUEFTUywgQ1dELCBQV0QsIExJU1QsIFJFVFIsIFNUT1IsIERFTEUsIFFVSVQsIE5PT1BgKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcnZlci5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gU3VudWN1IGhhdGFzxLE6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zZXJ2ZXIub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRlRQIHN1bnVjdXN1IGthcGFuZMSxYCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gRGF0YSBzZXJ2ZXIgYmHFn2xhdFxuICAgICAgdGhpcy5kYXRhU2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoZGF0YVNvY2tldCkgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZURhdGFDb25uZWN0aW9uKGRhdGFTb2NrZXQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuZGF0YVNlcnZlci5saXN0ZW4odGhpcy5jb25maWcuZGF0YVBvcnQsICgpID0+IHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFsrXSBEYXRhIHN1bnVjdXN1IGJhxZ9sYXTEsWxkxLE6IHBvcnQgJHt0aGlzLmNvbmZpZy5kYXRhUG9ydH1gKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmRhdGFTZXJ2ZXIub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIERhdGEgc3VudWN1IGhhdGFzxLE6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgTG9nZ2VyLmVycm9yKCdbRnRwU2VydmVyXSBCYcWfbGF0bWEgaGF0YXPEsTonLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFllbmkgYmHEn2xhbnTEsXnEsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbm5JZCA9IGBjb25uXyR7RGF0ZS5ub3coKX1fJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gWWVuaSBiYcSfbGFudMSxOiAke2Nvbm5JZH0gKElQOiAke3NvY2tldC5yZW1vdGVBZGRyZXNzfSlgKTtcblxuICAgIC8vIE1ha3NpbXVtIGJhxJ9sYW50xLEga29udHJvbMO8XG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbkNvdW50ID49IHRoaXMubWF4Q29ubmVjdGlvbnMpIHtcbiAgICAgIHNvY2tldD8ud3JpdGUoYDUwMyBTZXJ2aWNlIG5vdCBhdmFpbGFibGVcXHJcXG5gKTtcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbm5lY3Rpb25Db3VudCsrO1xuXG4gICAgY29uc3QgY29ubmVjdGlvbjogRnRwQ29ubmVjdGlvbiA9IHtcbiAgICAgIHNvY2tldCxcbiAgICAgIHVzZXI6IG51bGwsXG4gICAgICBwYXNzOiBudWxsLFxuICAgICAgaG9tZURpcjogJycsXG4gICAgICBjdXJyZW50RGlyOiAnJyxcbiAgICAgIHBlcm1pc3Npb25zOiB7fSxcbiAgICAgIHRyYW5zZmVyTW9kZTogbnVsbCxcbiAgICAgIHRyYW5zZmVyU2l6ZTogMCxcbiAgICAgIGxhc3RSZXBseTogMCxcbiAgICAgIGxhc3RNZXNzYWdlOiAnJyxcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0aW9ucy5zZXQoY29ubklkLCBjb25uZWN0aW9uKTtcblxuICAgIC8vIEJhxJ9sYW50xLEgYmHFn2xhdG1hIG1lc2FqxLFcbiAgICBzb2NrZXQ/LndyaXRlKGAyMjAgJHt0aGlzLmNvbmZpZy5iYW5uZXJ9XFxyXFxuYCk7XG5cbiAgICAvLyBCYcSfbGFudMSxIG9sYXlsYXLEsVxuICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgIHRoaXMuaGFuZGxlQ29udHJvbERhdGEoY29ubklkLCBkYXRhKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIEJhxJ9sYW50xLEgaGF0YXPEsSAoJHtjb25uSWR9KTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKGNvbm5JZCwgJ2Vycm9yJyk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEJhxJ9sYW50xLEga2FwYW5kxLE6ICR7Y29ubklkfWApO1xuICAgICAgdGhpcy5jbG9zZUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBCYcSfbGFudMSxIHphbWFuIGHFn8SxbcSxOiAke2Nvbm5JZH1gKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKGNvbm5JZCwgJ3RpbWVvdXQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLb250cm9sIGJhxJ9sYW50xLFzxLFuYSBnZWxlbiB2ZXJpeWkgc2F0xLFyIHNhdMSxciBheXLEscWfdMSxci5cbiAgICogVGVrIHBha2V0dGUgYmlyZGVuIMOnb2sga29tdXQgZ2VsZWJpbGlyLCB5YXLEsW0ga2FsYW4gc2F0xLFyIHNvbnJha2kgcGFrZXR0ZSB0YW1hbWxhbsSxci5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlQ29udHJvbERhdGEoY29ubklkOiBzdHJpbmcsIGRhdGE6IEJ1ZmZlcik6IHZvaWQge1xuICAgIGNvbnN0IGJ1ZmZlciA9ICh0aGlzLmlucHV0QnVmZmVycy5nZXQoY29ubklkKSB8fCAnJykgKyBkYXRhLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KC9cXHJcXG58XFxufFxcci8pO1xuICAgIC8vIFNvbiBwYXLDp2EgeWFyxLFtIHNhdMSxciBvbGFiaWxpcjogYmlyIHNvbnJha2kgcGFrZXRlIGthZGFyIHNha2xhXG4gICAgdGhpcy5pbnB1dEJ1ZmZlcnMuc2V0KGNvbm5JZCwgbGluZXMucG9wKCkgPz8gJycpO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICB0aGlzLmVucXVldWVDb21tYW5kKGNvbm5JZCwgbGluZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEtvbXV0bGFyxLEgYmHEn2xhbnTEsSBiYcWfxLFuYSBzxLFyYXlsYSBpxZ9sZSAoYXN5bmMga29tdXRsYXIgc8SxcmF5xLEgYm96bWFzxLFuKVxuICAgKi9cbiAgcHJpdmF0ZSBlbnF1ZXVlQ29tbWFuZChjb25uSWQ6IHN0cmluZywgbGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLmNvbW1hbmRRdWV1ZXMuZ2V0KGNvbm5JZCkgfHwgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgY29uc3QgbmV4dCA9IHByZXZpb3VzXG4gICAgICAudGhlbigoKSA9PiB0aGlzLnByb2Nlc3NDb21tYW5kKGNvbm5JZCwgbGluZSkpXG4gICAgICAuY2F0Y2goKGVycikgPT4gTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBLb211dCBpxZ9sZW5lbWVkaSAoJHtjb25uSWR9KTpgLCBlcnIpKTtcbiAgICB0aGlzLmNvbW1hbmRRdWV1ZXMuc2V0KGNvbm5JZCwgbmV4dCk7XG4gIH1cblxuICAvKipcbiAgICogVGVrIGJpciBrb211dCBzYXTEsXLEsW7EsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwcm9jZXNzQ29tbWFuZChjb25uSWQ6IHN0cmluZywgcmF3TGluZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgICAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICAgICAgaWYgKCFjb25uKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQmHEn2xhbnTEsSBidWx1bmFtYWTEsTogJHtjb25uSWR9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbGluZSA9IHJhd0xpbmUudHJpbSgpO1xuICAgICAgaWYgKGxpbmUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gS29tdXR1IGlsayBib8WfbHVrdGFuIGLDtmw6IGRvc3lhLyBkaXppbiBhZGxhcsSxbmRha2kgYm/Fn2x1a2xhciBrb3J1bnVyXG4gICAgICBjb25zdCBzZXBhcmF0b3JJbmRleCA9IGxpbmUuc2VhcmNoKC9cXHMvKTtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSAoc2VwYXJhdG9ySW5kZXggPT09IC0xID8gbGluZSA6IGxpbmUuc2xpY2UoMCwgc2VwYXJhdG9ySW5kZXgpKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgY29uc3QgYXJncyA9IHNlcGFyYXRvckluZGV4ID09PSAtMSA/ICcnIDogbGluZS5zbGljZShzZXBhcmF0b3JJbmRleCkudHJpbSgpO1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEtvbXV0OiAke2NvbW1hbmR9IChjb25uOiAke2Nvbm5JZH0pYCk7XG5cbiAgICAgIGlmIChjb21tYW5kID09PSAnVVNFUicpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlVXNlcihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1BBU1MnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVBhc3MoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdRVUlUJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVRdWl0KGNvbm5JZCwgY29ubiwgKGlkLCByZWFzb24pID0+IHRoaXMuY2xvc2VDb25uZWN0aW9uKGlkLCByZWFzb24pKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ05PT1AnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZU5vb3AoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1BXRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUHdkKGNvbm5JZCwgY29ubik7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdDV0QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZUN3ZChjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0xJU1QnIHx8IGNvbW1hbmQgPT09ICdOTFNUJykge1xuICAgICAgICBjb25zdCBsaXN0UmVzdWx0ID0gYXdhaXQgQ29tbWFuZHMuaGFuZGxlTGlzdChjb25uSWQsIGNvbm4sIHRoaXMudXNlck1hbmFnZXIhLCBzb2NrZXQpO1xuICAgICAgICBjb25zdCByZXN1bHRPYmogPSBsaXN0UmVzdWx0IGFzIGFueTtcbiAgICAgICAgaWYgKHJlc3VsdE9iaiAmJiByZXN1bHRPYmouZGF0YSAmJiB0eXBlb2YgcmVzdWx0T2JqLmRhdGEgPT09ICdvYmplY3QnICYmIHJlc3VsdE9iai5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgbGlzdERhdGEgPSByZXN1bHRPYmouZGF0YSBhcyB7IG91dHB1dDogc3RyaW5nLCBkaXJlY3Rvcnk6IHN0cmluZyB9O1xuICAgICAgICAgIHRoaXMucGVuZGluZ0xpc3REYXRhID0gbGlzdERhdGEub3V0cHV0O1xuICAgICAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIExJU1QgZGF0YSBiZWtsZW5peW9yOiAke2xpc3REYXRhLm91dHB1dCA/IGxpc3REYXRhLm91dHB1dC5sZW5ndGggOiAwfSBieXRlc2ApO1xuICAgICAgICAgIHRoaXMuZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUkVUUicpIHtcbiAgICAgICAgY29uc3QgcmV0clJlc3VsdCA9IGF3YWl0IENvbW1hbmRzLmhhbmRsZVJldHIoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISwgc29ja2V0KTtcbiAgICAgICAgY29uc3QgcmVzdWx0T2JqID0gcmV0clJlc3VsdCBhcyBhbnk7XG4gICAgICAgIGlmIChyZXN1bHRPYmogJiYgcmVzdWx0T2JqLmRhdGEgJiYgdHlwZW9mIHJlc3VsdE9iai5kYXRhID09PSAnb2JqZWN0JyAmJiByZXN1bHRPYmouZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHJldHJEYXRhID0gcmVzdWx0T2JqLmRhdGEgYXMgeyBmaWxlUGF0aDogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nUmV0ckZpbGUgPSByZXRyRGF0YS5maWxlUGF0aDtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdSZXRyQ29ubklkID0gY29ubklkO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBSRVRSIGRvc3lhIGJla2xlbml5b3I6ICR7cmV0ckRhdGEuZmlsZVBhdGh9YCk7XG4gICAgICAgICAgdGhpcy5lbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdTVE9SJykge1xuICAgICAgICBjb25zdCBzdG9yUmVzdWx0ID0gYXdhaXQgQ29tbWFuZHMuaGFuZGxlU3Rvcihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhLCBzb2NrZXQpO1xuICAgICAgICBjb25zdCByZXN1bHRPYmogPSBzdG9yUmVzdWx0IGFzIGFueTtcbiAgICAgICAgaWYgKHJlc3VsdE9iaiAmJiByZXN1bHRPYmouZGF0YSAmJiB0eXBlb2YgcmVzdWx0T2JqLmRhdGEgPT09ICdvYmplY3QnICYmIHJlc3VsdE9iai5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3Qgc3RvckRhdGEgPSByZXN1bHRPYmouZGF0YSBhcyB7IGZpbGVQYXRoOiBzdHJpbmcgfTtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdTdG9yRmlsZSA9IHN0b3JEYXRhLmZpbGVQYXRoO1xuICAgICAgICAgIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFNUT1IgZG9zeWEgYmVrbGVuaXlvcjogJHtzdG9yRGF0YS5maWxlUGF0aH1gKTtcbiAgICAgICAgICB0aGlzLmVuc3VyZURhdGFDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0RFTEUnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZURlbGUoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQQVNWJykge1xuICAgICAgICAvLyBQYXNpZiBtb2Q6IGRhdGEgYmHEn2xhbnTEsXPEsW7EsW4gc2FoaWJpIGJ1IGtvbXV0dSB2ZXJlbiBiYcSfbGFudMSxZMSxclxuICAgICAgICB0aGlzLnBhc3NpdmVDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG5cbiAgICAgICAgLy8gWWFwxLFsYW5kxLFyxLFsYW4gYXJhbMSxa3RhbiBwb3J0IHNlw6cgdmUgZGlubGVtZXllIGFsXG4gICAgICAgIGNvbnN0IHBvcnQgPSB0aGlzLm5leHRQYXNzaXZlUG9ydCgpO1xuICAgICAgICBjb25zdCBsaXN0ZW5pbmcgPSBhd2FpdCB0aGlzLmVuc3VyZVBhc3NpdmVMaXN0ZW5lcihwb3J0KTtcbiAgICAgICAgaWYgKGxpc3RlbmluZykge1xuICAgICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVBhc3YoY29ubklkLCBjb25uLCB0aGlzLnBhc3NpdmVJcCwgcG9ydCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc29ja2V0Py53cml0ZShgNDI1IENhbm5vdCBvcGVuIGRhdGEgY29ubmVjdGlvblxcclxcbmApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQT1JUJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQb3J0KGNvbm4sIGFyZ3MpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnRkVBVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlRmVhdChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnU1lTVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlU3lzdChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnVFlQRScpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlVHlwZShjb25uLCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ01LRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlTWtkKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUk1EJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVSbWQoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdSTkZSJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVSbmZyKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUk5UTycpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm50byhjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJpbGlubWV5ZW4ga29tdXRcbiAgICAgICAgc29ja2V0Py53cml0ZShgNTAyIENvbW1hbmQgbm90IGltcGxlbWVudGVkOiAke2NvbW1hbmR9XFxyXFxuYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gVmVyaSBpxZ9sZW1lIGhhdGFzxLEgKCR7Y29ubklkfSk6YCwgZXJyb3IpO1xuICAgICAgY29uc3QgY29ubiA9IHRoaXMuY29ubmVjdGlvbnMuZ2V0KGNvbm5JZCk7XG4gICAgICBjb25zdCBzb2NrZXQgPSBjb25uPy5zb2NrZXQ7XG4gICAgICBzb2NrZXQ/LndyaXRlKGA1MDAgSW50ZXJuYWwgc2VydmVyIGVycm9yXFxyXFxuYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsW7EsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVEYXRhQ29ubmVjdGlvbihzb2NrZXQ6IG5ldC5Tb2NrZXQpOiB2b2lkIHtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBiYcSfbGFudMSxc8SxIGt1cnVsZHVgKTtcbiAgICAvLyBEYXRhIGNvbm5lY3Rpb24gacOnaW4gacWfbGVtbGVyXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgLy8gRGF0YSB0cmFuc2ZlciBpxZ9sZW1sZXJpXG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGJhxJ9sYW50xLEgaGF0YXPEsTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBiYcSfbGFudMSxc8SxIGthcGFuZMSxYCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGF0YSBiYcSfbGFudMSxc8SxbsSxIChQQVNWL1BPUlQpIGthYnVsIGV0IHZlIGJla2xleWVuIGFrdGFyxLFtxLEgYmHEn2xhLlxuICAgKiBWZXJpIGFrdGFyxLFtxLEga29tdXQgKExJU1QvUkVUUi9TVE9SKSBnZWxkacSfaW5kZSBiYcWfbGFyOyBpc3RlbWNpIHZlcmlcbiAgICogYmHEn2xhbnTEsXPEsW7EsSBrb211dHRhbiDDtm5jZSBhw6d0xLHEn8SxbmRhIGJhxJ9sYW50xLEgYmVrbGV0aWxpci5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlUGFzc2l2ZURhdGFDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCwgY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBiYcSfbGFudMSxc8SxIGthYnVsIGVkaWxkaTogJHtjb25uSWR9YCk7XG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGJhxJ9sYW50xLEgaGF0YXPEsTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBeW7EsSBhbmRhIHlhbG7EsXpjYSBiaXIgZGF0YSBiYcSfbGFudMSxc8SxIGt1bGxhbsSxbMSxclxuICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgIT09IHNvY2tldCAmJiAhdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveSgpO1xuICAgIH1cbiAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gc29ja2V0O1xuICAgIHRoaXMudHJ5U2VydmVEYXRhKCk7XG4gIH1cblxuICAvKipcbiAgICogTElTVC9SRVRSL1NUT1IgacOnaW4gdmVyaSBiYcSfbGFudMSxc8SxbsSxIGhhesSxcmxhOlxuICAgKiBwYXNpZiBtb2RkYSBpc3RlbWNpbmluIGJhxJ9sYW5tYXPEsSBiZWtsZW5pciwgYWt0aWYgbW9kZGEgKFBPUlQpIHN1bnVjdSBiYcSfbGFuxLFyLlxuICAgKi9cbiAgcHJpdmF0ZSBlbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgdGhpcy50cnlTZXJ2ZURhdGEoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoIWNvbm4gfHwgY29ubi5kYXRhTW9kZSAhPT0gJ2FjdGl2ZScgfHwgIWNvbm4uYWN0aXZlRGF0YVRhcmdldCkge1xuICAgICAgLy8gUGFzaWYgbW9kOiBpc3RlbWNpbmluIGJhxJ9sYW5tYXPEsSBiZWtsZW5pciAoYmHEn2xhbnTEsSBnZWxpbmNlIHRyeVNlcnZlRGF0YSDDp2HEn3LEsWzEsXIpXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gY29ubi5hY3RpdmVEYXRhVGFyZ2V0O1xuICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHRhcmdldC5wb3J0LCB0YXJnZXQuaXAsICgpID0+IHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBBa3RpZiBkYXRhIGJhxJ9sYW50xLFzxLEga3VydWxkdTogJHt0YXJnZXQuaXB9OiR7dGFyZ2V0LnBvcnR9YCk7XG4gICAgICB0aGlzLmhhbmRsZVBhc3NpdmVEYXRhQ29ubmVjdGlvbihzb2NrZXQsIGNvbm5JZCk7XG4gICAgfSk7XG4gICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQWt0aWYgZGF0YSBiYcSfbGFudMSxIGhhdGFzxLE6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9PT0gc29ja2V0KSB7XG4gICAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuICAgICAgfVxuICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCZWtsZXllbiBMSVNUL1JFVFIvU1RPUiBha3RhcsSxbcSxbsSxLCB2ZXJpIGJhxJ9sYW50xLFzxLEgaGF6xLFyc2EgYmHFn2xhdC5cbiAgICogMjI2IHlhbsSxdMSxbsSxIHZlcmkgZ2Vyw6dla3RlbiBnw7ZuZGVyaWxkaWt0ZW4gLyBhbMSxbmTEsWt0YW4gc29ucmEgZ8O2bmRlci5cbiAgICovXG4gIHByaXZhdGUgdHJ5U2VydmVEYXRhKCk6IHZvaWQge1xuICAgIGNvbnN0IHNvY2tldCA9IHRoaXMucGVuZGluZ0RhdGFTb2NrZXQ7XG4gICAgaWYgKCFzb2NrZXQgfHwgc29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIExJU1QgLyBOTFNUXG4gICAgaWYgKHRoaXMucGVuZGluZ0xpc3REYXRhICE9PSBudWxsICYmIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnBlbmRpbmdMaXN0RGF0YTtcbiAgICAgIGNvbnN0IGNvbm5JZCA9IHRoaXMucGVuZGluZ0xpc3RDb25uSWQ7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0RGF0YSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0Q29ubklkID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTElTVCBkYXRhIGfDtm5kZXJpbGl5b3I6ICR7ZGF0YS5sZW5ndGh9IGJ5dGVzYCk7XG4gICAgICBzb2NrZXQub25jZSgnZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5MSVNUX0VORCwgJ0RpcmVjdG9yeSBsaXN0aW5nIGNvbXBsZXRlJyk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC53cml0ZShkYXRhLCAoKSA9PiBzb2NrZXQuZW5kKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFJFVFJcbiAgICBpZiAodGhpcy5wZW5kaW5nUmV0ckZpbGUgIT09IG51bGwgJiYgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMucGVuZGluZ1JldHJGaWxlO1xuICAgICAgY29uc3QgY29ubklkID0gdGhpcy5wZW5kaW5nUmV0ckNvbm5JZDtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJGaWxlID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJDb25uSWQgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG5cbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBSRVRSIGRvc3lhIGfDtm5kZXJpbGl5b3I6ICR7ZmlsZX1gKTtcbiAgICAgIGNvbnN0IHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGUpO1xuICAgICAgcmVhZFN0cmVhbS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gUkVUUiBva3VtYSBoYXRhc8SxOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5GSUxFX05PVF9GT1VORCwgJ0Nhbm5vdCByZWFkIGZpbGUnKTtcbiAgICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0Lm9uY2UoJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuUkVUUl9PSywgJ1JldHIgY29tcGxldGUnKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZFN0cmVhbS5waXBlKHNvY2tldCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU1RPUlxuICAgIGlmICh0aGlzLnBlbmRpbmdTdG9yRmlsZSAhPT0gbnVsbCAmJiB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5wZW5kaW5nU3RvckZpbGU7XG4gICAgICBjb25zdCBjb25uSWQgPSB0aGlzLnBlbmRpbmdTdG9yQ29ubklkO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcblxuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFNUT1IgZG9zeWEgYWzEsW7EsXlvcjogJHtmaWxlfWApO1xuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKTtcbiAgICAgIHdyaXRlU3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTVE9SIHlhem1hIGhhdGFzxLE6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLklOVEVSTkFMX0VSUiwgJ0Nhbm5vdCB3cml0ZSBmaWxlJyk7XG4gICAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICAgIHdyaXRlU3RyZWFtLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLlNUT1JfT0ssICdTdG9yIGNvbXBsZXRlJyk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5waXBlKHdyaXRlU3RyZWFtKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBIZW7DvHogYmVrbGV5ZW4gYWt0YXLEsW0geW9rOiBiYcSfbGFudMSxIGJpciBzb25yYWtpIGtvbXV0IGnDp2luIGHDp8SxayB0dXR1bHVyXG4gIH1cblxuICAvKipcbiAgICogQmHEn2xhbnTEsW7EsW4gYmVrbGV5ZW4gYWt0YXLEsW3EsW7EsSB0ZW1pemxlICh5ZW5pIFBBU1YgZ2VsaW5jZSBlc2tpc2kgZ2XDp2Vyc2l6IG9sdXIpXG4gICAqL1xuICBwcml2YXRlIGNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlbmRpbmdMaXN0Q29ubklkID09PSBjb25uSWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3REYXRhID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9PT0gY29ubklkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyQ29ubklkID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW5hIHlhbsSxdCBnw7ZuZGVyXG4gICAqL1xuICBwcml2YXRlIHdyaXRlQ29udHJvbChjb25uSWQ6IHN0cmluZywgY29kZTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubiAmJiBjb25uLnNvY2tldCkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBjb2RlO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICBjb25uLnNvY2tldC53cml0ZShgJHtjb2RlfSAke21lc3NhZ2V9YCArICdcXHJcXG4nKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEJhxJ9sYW50xLF5xLEga2FwYXRcbiAgICovXG4gIHB1YmxpYyBjbG9zZUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xuICAgIC8vIEJhxJ9sYW50xLF5YSBhaXQgdGFtcG9uLCBrdXlydWsgdmUgYmVrbGV5ZW4gYWt0YXLEsW0ga2F5xLF0bGFyxLFuxLEgdGVtaXpsZVxuICAgIHRoaXMuaW5wdXRCdWZmZXJzLmRlbGV0ZShjb25uSWQpO1xuICAgIHRoaXMuY29tbWFuZFF1ZXVlcy5kZWxldGUoY29ubklkKTtcbiAgICB0aGlzLmNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQpO1xuICAgIGlmICh0aGlzLnBhc3NpdmVDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wYXNzaXZlQ29ubklkID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubikge1xuICAgICAgY29ubi5zb2NrZXQ/LmVuZCgpO1xuICAgICAgdGhpcy5jb25uZWN0aW9ucy5kZWxldGUoY29ubklkKTtcbiAgICAgIHRoaXMuY29ubmVjdGlvbkNvdW50LS07XG4gICAgICBpZiAocmVhc29uKSB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBCYcSfbGFudMSxIGthcGF0xLFsZMSxOiAke2Nvbm5JZH0gKHNlw6dlbmVrOiAke3JlYXNvbn0pYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQmHEn2xhbnTEsSBrYXBhdMSxbGTEsTogJHtjb25uSWR9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=