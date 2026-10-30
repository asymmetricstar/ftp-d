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
const os = __importStar(require("os"));
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
        this.passiveIp = null;
        this.passiveDataServer = null;
        this.passiveDataPort = 50000;
        this.passivePortCursor = 0;
        this.pendingListData = null;
        this.pendingListConnId = null;
        this.pendingRetrFile = null;
        this.pendingRetrConnId = null;
        this.pendingStorFile = null;
        this.pendingStorConnId = null;
        this.dataConnectionClosedEarly = false;
        this.inputBuffers = new Map();
        this.commandQueues = new Map();
        this.pendingDataSocket = null;
        this.passiveConnId = null;
        this.dataWaitTimer = null;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.maxConnections = this.config.maxConnections || DEFAULT_CONFIG.maxConnections;
        if (typeof this.config.passiveIp === 'string' && this.config.passiveIp.trim() !== '') {
            this.passiveIp = this.config.passiveIp.trim();
        }
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
        logger_1.Logger.info(`[FtpServer] FTP server starting...`);
        logger_1.Logger.info(`[FtpServer] Control port: ${this.config.port}`);
        logger_1.Logger.info(`[FtpServer] Data port: ${this.config.dataPort}`);
        logger_1.Logger.info(`[FtpServer] Max connections: ${this.maxConnections}`);
        logger_1.Logger.info(`[FtpServer] Banner: ${this.config.banner}`);
        logger_1.Logger.info(`[FtpServer] PASV port range: ${this.config.passivePortRange.min}-${this.config.passivePortRange.max}`);
    }
    normalizePortRange(range) {
        const fallback = { ...DEFAULT_CONFIG.passivePortRange };
        if (!range) {
            return fallback;
        }
        const min = Math.floor(Number(range.min));
        const max = Math.floor(Number(range.max));
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max > 65535 || min > max) {
            logger_1.Logger.warn(`[FtpServer] Invalid PASV port range: ${range.min}-${range.max}, using default ${fallback.min}-${fallback.max}`);
            return fallback;
        }
        return { min, max };
    }
    normalizeIp(addr) {
        if (!addr)
            return null;
        let ip = addr.trim();
        const zoneIndex = ip.indexOf('%');
        if (zoneIndex !== -1)
            ip = ip.slice(0, zoneIndex);
        if (ip.toLowerCase().startsWith('::ffff:'))
            ip = ip.slice(7);
        return ip || null;
    }
    resolvePassiveIp(clientSocket) {
        const configured = this.normalizeIp(this.passiveIp);
        if (configured && configured !== '127.0.0.1' && configured !== '0.0.0.0' && configured !== '::1') {
            return configured;
        }
        const local = this.normalizeIp(clientSocket?.localAddress);
        if (local && net.isIPv4(local) && local !== '127.0.0.1' && local !== '0.0.0.0' && local !== '::1') {
            return local;
        }
        return '127.0.0.1';
    }
    resolveListenIp() {
        try {
            const ifaces = os.networkInterfaces();
            for (const name of Object.keys(ifaces)) {
                const iface = ifaces[name];
                if (!iface)
                    continue;
                for (const info of iface) {
                    const family = typeof info.family === 'string' ? info.family : (info.family === 4 ? 'IPv4' : 'IPv6');
                    if (family === 'IPv4' && !info.internal && info.address && info.address !== '0.0.0.0' && info.address !== '127.0.0.1') {
                        const ip = this.normalizeIp(info.address);
                        if (ip && net.isIPv4(ip))
                            return ip;
                    }
                }
            }
        }
        catch (e) {
        }
        return '127.0.0.1';
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
            logger_1.Logger.info(`[FtpServer] Passive data connection established: port ${port} (${ownerId})`);
            this.handlePassiveDataConnection(dataSocket, ownerId);
        });
        return new Promise((resolve) => {
            server.once('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Passive port ${port} cannot open: ${err.message}`);
                resolve(false);
            });
            server.listen(port, () => {
                this.passiveDataServer = server;
                this.passiveDataPort = port;
                logger_1.Logger.info(`[FtpServer] Passive data server started: port ${port}`);
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
                logger_1.Logger.info(`[FtpServer] FTP server started: ftp://${this.resolveListenIp()}:${this.config.port}`);
                logger_1.Logger.info(`[FtpServer] User data: ${this.config.userFile}`);
                logger_1.Logger.info(`[FtpServer] Commands: USER, PASS, CWD, PWD, LIST, RETR, STOR, DELE, QUIT, NOOP`);
            });
            this.server.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Server error: ${err.message}`);
            });
            this.server.on('close', () => {
                logger_1.Logger.info(`[FtpServer] FTP server closed`);
            });
            this.dataServer = net.createServer((dataSocket) => {
                this.handleDataConnection(dataSocket);
            });
            this.dataServer.listen(this.config.dataPort, () => {
                logger_1.Logger.info(`[FtpServer] Data server started: port ${this.config.dataPort}`);
            });
            this.dataServer.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Data server error: ${err.message}`);
            });
        }
        catch (error) {
            logger_1.Logger.error('[FtpServer] Startup error:', error);
        }
    }
    handleConnection(socket) {
        const connId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logger_1.Logger.info(`[FtpServer] New connection: ${connId} (IP: ${socket.remoteAddress})`);
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
            logger_1.Logger.error(`[FtpServer] Connection error (${connId}): ${err.message}`);
            this.closeConnection(connId, 'error');
        });
        socket.on('close', () => {
            logger_1.Logger.info(`[FtpServer] Connection closed: ${connId}`);
            this.closeConnection(connId);
        });
        socket.on('timeout', () => {
            logger_1.Logger.info(`[FtpServer] Connection timeout: ${connId}`);
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
            .catch((err) => logger_1.Logger.error(`[FtpServer] Command processing failed (${connId}):`, err));
        this.commandQueues.set(connId, next);
    }
    async processCommand(connId, rawLine) {
        try {
            const conn = this.connections.get(connId);
            const socket = conn?.socket;
            if (!conn) {
                logger_1.Logger.error(`[FtpServer] Connection not found: ${connId}`);
                return;
            }
            const line = rawLine.trim();
            if (line === '') {
                return;
            }
            const separatorIndex = line.search(/\s/);
            const command = (separatorIndex === -1 ? line : line.slice(0, separatorIndex)).toUpperCase();
            const args = separatorIndex === -1 ? '' : line.slice(separatorIndex).trim();
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
                    logger_1.Logger.info(`[FtpServer] LIST data waiting: ${listData.output ? listData.output.length : 0} bytes`);
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
                    logger_1.Logger.info(`[FtpServer] RETR file waiting: ${retrData.filePath}`);
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
                    logger_1.Logger.info(`[FtpServer] STOR file waiting: ${storData.filePath}`);
                    this.ensureDataConnection(connId);
                }
            }
            else if (command === 'DELE') {
                await Commands.handleDele(connId, conn, args, this.userManager);
            }
            else if (command === 'PASV') {
                this.passiveConnId = connId;
                this.clearPendingTransfers(connId);
                this.dataConnectionClosedEarly = false;
                const port = this.nextPassivePort();
                const listening = await this.ensurePassiveListener(port);
                if (listening) {
                    const effectivePassiveIp = this.resolvePassiveIp(conn.socket);
                    await Commands.handlePasv(connId, conn, effectivePassiveIp, port);
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
            logger_1.Logger.error(`[FtpServer] Data processing error (${connId}):`, error);
            const conn = this.connections.get(connId);
            const socket = conn?.socket;
            socket?.write(`500 Internal server error\r\n`);
        }
    }
    handleDataConnection(socket) {
        logger_1.Logger.info(`[FtpServer] Data connection established`);
        socket.on('data', (data) => {
        });
        socket.on('error', (err) => {
            logger_1.Logger.error(`[FtpServer] Data connection error: ${err.message}`);
        });
        socket.on('close', () => {
            logger_1.Logger.info(`[FtpServer] Data connection closed`);
        });
    }
    handlePassiveDataConnection(socket, connId) {
        logger_1.Logger.info(`[FtpServer] Passive data connection accepted: ${connId} (remote port ${socket.remotePort})`);
        this.dataConnectionClosedEarly = false;
        socket.on('error', (err) => {
            logger_1.Logger.error(`[FtpServer] Data connection error: ${err.message} (remote port ${socket.remotePort})`);
            if (this.pendingDataSocket === socket) {
                this.dataConnectionClosedEarly = true;
                this.pendingDataSocket = null;
            }
            socket.destroy();
        });
        socket.on('close', (hadError) => {
            if (this.pendingDataSocket === socket) {
                this.dataConnectionClosedEarly = true;
                this.pendingDataSocket = null;
            }
        });
        if (this.pendingDataSocket && this.pendingDataSocket !== socket && !this.pendingDataSocket.destroyed) {
            this.pendingDataSocket.destroy();
        }
        this.pendingDataSocket = socket;
        logger_1.Logger.debug(`[FtpServer] pendingDataSocket assigned (remote port ${socket.remotePort})`);
        this.tryServeData();
    }
    ensureDataConnection(connId) {
        this.armDataWaitTimeout(connId);
        logger_1.Logger.debug(`[FtpServer] ensureDataConnection(${connId}): pending socket ${this.pendingDataSocket ? `exists (remote port ${this.pendingDataSocket.remotePort}, destroyed=${this.pendingDataSocket.destroyed})` : 'none'}`);
        if (this.pendingDataSocket && !this.pendingDataSocket.destroyed) {
            this.tryServeData();
            return;
        }
        const conn = this.connections.get(connId);
        if (!conn || conn.dataMode !== 'active' || !conn.activeDataTarget) {
            if (this.dataConnectionClosedEarly &&
                this.pendingStorFile !== null &&
                this.pendingStorConnId === connId) {
                this.dataConnectionClosedEarly = false;
                const file = this.pendingStorFile;
                this.pendingStorFile = null;
                this.pendingStorConnId = null;
                this.clearDataWaitTimeout();
                try {
                    const pathMod = require('path');
                    const fsMod = require('fs');
                    fsMod.mkdirSync(pathMod.dirname(file), { recursive: true });
                    fsMod.writeFileSync(file, '');
                }
                catch (e) {
                    logger_1.Logger.error(`[FtpServer] STOR early close file error: ${e.message}`);
                }
                this.writeControl(connId, 226, 'Stor complete');
                logger_1.Logger.info(`[FtpServer] STOR completed via early close: ${file}`);
            }
            return;
        }
        const target = conn.activeDataTarget;
        const socket = net.createConnection(target.port, target.ip, () => {
            logger_1.Logger.info(`[FtpServer] Active data connection established: ${target.ip}:${target.port}`);
            this.handlePassiveDataConnection(socket, connId);
        });
        socket.on('error', (err) => {
            logger_1.Logger.error(`[FtpServer] Active data connection error: ${err.message}`);
            if (this.pendingDataSocket === socket) {
                this.pendingDataSocket = null;
            }
            socket.destroy();
        });
    }
    tryServeData() {
        const socket = this.pendingDataSocket;
        if (!socket || socket.destroyed) {
            logger_1.Logger.debug(`[FtpServer] tryServeData skipped: socket ${socket ? `destroyed (remote port ${socket.remotePort})` : 'none'}, pending LIST=${this.pendingListConnId !== null} RETR=${this.pendingRetrConnId !== null} STOR=${this.pendingStorConnId !== null}`);
            return;
        }
        if (this.pendingListData !== null && this.pendingListConnId !== null) {
            const data = this.pendingListData;
            const connId = this.pendingListConnId;
            this.pendingListData = null;
            this.pendingListConnId = null;
            this.pendingDataSocket = null;
            this.clearDataWaitTimeout();
            logger_1.Logger.info(`[FtpServer] LIST data sending: ${data.length} bytes`);
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
            this.clearDataWaitTimeout();
            logger_1.Logger.info(`[FtpServer] RETR file sending: ${file}`);
            const readStream = fs.createReadStream(file);
            readStream.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] RETR read error: ${err.message}`);
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
            this.clearDataWaitTimeout();
            logger_1.Logger.info(`[FtpServer] STOR file receiving: ${file}`);
            const writeStream = fs.createWriteStream(file);
            writeStream.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] STOR write error: ${err.message}`);
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
    armDataWaitTimeout(connId) {
        if (this.dataWaitTimer) {
            return;
        }
        this.dataWaitTimer = setTimeout(() => {
            this.dataWaitTimer = null;
            if (this.pendingDataSocket && !this.pendingDataSocket.destroyed) {
                return;
            }
            const pending = this.pendingListConnId !== null || this.pendingRetrConnId !== null || this.pendingStorConnId !== null;
            if (!pending || this.pendingListConnId !== connId && this.pendingRetrConnId !== connId && this.pendingStorConnId !== connId) {
                return;
            }
            logger_1.Logger.warn(`[FtpServer] Data connection timeout: ${connId} (no connection after 150)`);
            this.clearPendingTransfers(connId);
            this.writeControl(connId, types_1.ReplyCode.TRANSFER_ABORTED, 'Transfer aborted: data connection timeout');
        }, FtpServer.DATA_WAIT_TIMEOUT_MS);
    }
    clearDataWaitTimeout() {
        if (this.dataWaitTimer) {
            clearTimeout(this.dataWaitTimer);
            this.dataWaitTimer = null;
        }
    }
    clearPendingTransfers(connId) {
        this.clearDataWaitTimeout();
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
                logger_1.Logger.info(`[FtpServer] Connection closed: ${connId} (reason: ${reason})`);
            }
            else {
                logger_1.Logger.info(`[FtpServer] Connection closed: ${connId}`);
            }
        }
    }
}
exports.FtpServer = FtpServer;
FtpServer.DATA_WAIT_TIMEOUT_MS = 15000;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnRwU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvRnRwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLEdBQUcsZ0NBQVk7QUFDM0IsTUFBWSxFQUFFLCtCQUFXO0FBQ3pCLE1BQVksSUFBSSxpQ0FBYTtBQUM3QixvQ0FBaUY7QUFDakYsZ0RBQTZDO0FBRTdDLDRDQUFtRDtBQUNuRCxNQUFZLFFBQVEsd0NBQW9CO0FBS3hDLE1BQU0sY0FBYyxHQUFpQjtJQUNuQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0lBQ1osUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQztJQUMvQyxjQUFjLEVBQUUsR0FBRztJQUNuQixRQUFRLEVBQUUsTUFBTTtJQUVoQixNQUFNLEVBQUUsRUFBRTtJQUVWLGdCQUFnQixFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFO0NBQzdDLENBQUM7QUFLRjtJQW9DRSxZQUFZLE1BQU0sR0FBbUMsRUFBRTtRQW5DL0MsV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUFzQixJQUFJLENBQUM7UUFDckMsZ0JBQVcsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNwRCxvQkFBZSxHQUFxQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRTlDLGdCQUFXLEdBQXVCLElBQUksQ0FBQztRQUN2QyxvQkFBZSxHQUFXLENBQUMsQ0FBQztRQUU1QixnQkFBVyxHQUFZLEtBQUssQ0FBQztRQUM3QixjQUFTLEdBQWtCLElBQUksQ0FBQztRQUNoQyxzQkFBaUIsR0FBc0IsSUFBSSxDQUFDO1FBQzVDLG9CQUFlLEdBQVcsS0FBSyxDQUFDO1FBRWhDLHNCQUFpQixHQUFXLENBQUMsQ0FBQztRQUM5QixvQkFBZSxHQUFrQixJQUFJLENBQUM7UUFDdEMsc0JBQWlCLEdBQWtCLElBQUksQ0FBQztRQUN4QyxvQkFBZSxHQUFrQixJQUFJLENBQUM7UUFDdEMsc0JBQWlCLEdBQWtCLElBQUksQ0FBQztRQUN4QyxvQkFBZSxHQUFrQixJQUFJLENBQUM7UUFDdEMsc0JBQWlCLEdBQWtCLElBQUksQ0FBQztRQUV4Qyw4QkFBeUIsR0FBWSxLQUFLLENBQUM7UUFFM0MsaUJBQVksR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUU5QyxrQkFBYSxHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRXRELHNCQUFpQixHQUFzQixJQUFJLENBQUM7UUFFNUMsa0JBQWEsR0FBa0IsSUFBSSxDQUFDO1FBRXBDLGtCQUFhLEdBQTBCLElBQUksQ0FBQztRQUtsRCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxjQUFjLEVBQUUsR0FBRyxNQUFNLEVBQWtCLENBQUM7UUFDL0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsSUFBSSxjQUFjLENBQUMsY0FBYyxDQUFDO1FBRWxGLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDckYsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoRCxDQUFDO1FBR0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdkYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxtQkFBbUIsQ0FBQztRQUdyRixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFckYsSUFBSSxZQUFZLEdBQWEsaUJBQVEsQ0FBQyxJQUFJLENBQUM7UUFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxZQUFZLEdBQUcsaUJBQVEsQ0FBQyxLQUFLLENBQUM7UUFDaEMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDM0MsWUFBWSxHQUFHLGlCQUFRLENBQUMsSUFBSSxDQUFDO1FBQy9CLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzVDLFlBQVksR0FBRyxpQkFBUSxDQUFDLEtBQUssQ0FBQztRQUNoQyxDQUFDO1FBQ0QsZUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU5QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUkseUJBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pELGVBQU0sQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUNsRCxlQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDN0QsZUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzlELGVBQU0sQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLGVBQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN6RCxlQUFNLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDdEgsQ0FBQztJQUtPLGtCQUFrQixDQUFDLEtBQWlEO1FBQzFFLE1BQU0sUUFBUSxHQUFHLEVBQUUsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEtBQUssSUFBSSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDMUYsZUFBTSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxtQkFBbUIsUUFBUSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUM3SCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBS08sV0FBVyxDQUFDLElBQStCO1FBQ2pELElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDdkIsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JCLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDO1lBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7WUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RCxPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUM7SUFDcEIsQ0FBQztJQWdCTyxnQkFBZ0IsQ0FBQyxZQUF3QjtRQUUvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRCxJQUFJLFVBQVUsSUFBSSxVQUFVLEtBQUssV0FBVyxJQUFJLFVBQVUsS0FBSyxTQUFTLElBQUksVUFBVSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ2pHLE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUM7UUFHRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMzRCxJQUFJLEtBQUssSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxXQUFXLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbEcsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBTUQsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQU1PLGVBQWU7UUFDckIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixFQUFTLENBQUM7WUFDN0MsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLEtBQUs7b0JBQUUsU0FBUztnQkFDckIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDekIsTUFBTSxNQUFNLEdBQUcsT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDckcsSUFBSSxNQUFNLEtBQUssTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQUM7d0JBQ3RILE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUMxQyxJQUFJLEVBQUUsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzs0QkFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDdEMsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBRWIsQ0FBQztRQUNELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFLTyxlQUFlO1FBQ3JCLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUNsRCxNQUFNLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUMzQixNQUFNLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUM3RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFNTyxLQUFLLENBQUMscUJBQXFCLENBQUMsSUFBWTtRQUM5QyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDaEcsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBR0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMzQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDekMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUM5QixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUM3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQztZQUN6QyxlQUFNLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxJQUFJLEtBQUssT0FBTyxHQUFHLENBQUMsQ0FBQztZQUMxRixJQUFJLENBQUMsMkJBQTJCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hELENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLE9BQU8sQ0FBVSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzNCLGVBQU0sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO2dCQUM1QixlQUFNLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNyRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFLTSxLQUFLO1FBQ1YsSUFBSSxDQUFDO1lBQ0gsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtnQkFDeEMsZUFBTSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDbkcsZUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxlQUFNLENBQUMsSUFBSSxDQUFDLGdGQUFnRixDQUFDLENBQUM7WUFDaEcsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDOUIsZUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDM0QsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUMzQixlQUFNLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUM7WUFDL0MsQ0FBQyxDQUFDLENBQUM7WUFHSCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3hDLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUNoRCxlQUFNLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDL0UsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDbEMsZUFBTSxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDaEUsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLGVBQU0sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsQ0FBQztJQUNILENBQUM7SUFLTyxnQkFBZ0IsQ0FBQyxNQUFrQjtRQUN6QyxNQUFNLE1BQU0sR0FBRyxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvRSxlQUFNLENBQUMsSUFBSSxDQUFDLCtCQUErQixNQUFNLFNBQVMsTUFBTSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFHbkYsSUFBSSxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNoRCxNQUFNLEVBQUUsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2IsT0FBTztRQUNULENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkIsTUFBTSxVQUFVLEdBQWtCO1lBQ2hDLE1BQU07WUFDTixJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsT0FBTyxFQUFFLEVBQUU7WUFDWCxVQUFVLEVBQUUsRUFBRTtZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsWUFBWSxFQUFFLElBQUk7WUFDbEIsWUFBWSxFQUFFLENBQUM7WUFDZixTQUFTLEVBQUUsQ0FBQztZQUNaLFdBQVcsRUFBRSxFQUFFO1NBQ2hCLENBQUM7UUFFRixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFHekMsTUFBTSxFQUFFLEtBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxNQUFNLENBQUMsQ0FBQztRQUcvQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO1lBQ2pDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3pCLGVBQU0sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLE1BQU0sTUFBTSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUN6RSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUN0QixlQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFDeEIsZUFBTSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFNTyxpQkFBaUIsQ0FBQyxNQUFjLEVBQUUsSUFBWTtRQUNwRCxNQUFNLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRWpELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsQ0FBQztJQUNILENBQUM7SUFLTyxjQUFjLENBQUMsTUFBYyxFQUFFLElBQVk7UUFDakQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLFFBQVE7YUFDbEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzdDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsZUFBTSxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsTUFBTSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUtPLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBYyxFQUFFLE9BQWU7UUFDMUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQztZQUM1QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1YsZUFBTSxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDNUQsT0FBTztZQUNULENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUIsSUFBSSxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU87WUFDVCxDQUFDO1lBR0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLE9BQU8sR0FBRyxDQUFDLGNBQWMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzdGLE1BQU0sSUFBSSxHQUFHLGNBQWMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTVFLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN2QixNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVksQ0FBQyxDQUFDO1lBQ25FLENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBWSxDQUFDLENBQUM7WUFDbkUsQ0FBQztpQkFBTSxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzVGLENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUMsQ0FBQztpQkFBTSxJQUFJLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxDQUFDO2lCQUFNLElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUM3QixNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVksQ0FBQyxDQUFDO1lBQ2xFLENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDcEQsTUFBTSxVQUFVLEdBQUcsTUFBTSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdEYsTUFBTSxTQUFTLEdBQUcsVUFBaUIsQ0FBQztnQkFDcEMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLElBQUksSUFBSSxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ2pHLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUE2QyxDQUFDO29CQUN6RSxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7b0JBQ3ZDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUM7b0JBQ2hDLGVBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNwRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLFVBQVUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDNUYsTUFBTSxTQUFTLEdBQUcsVUFBaUIsQ0FBQztnQkFDcEMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLElBQUksSUFBSSxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ2pHLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUE0QixDQUFDO29CQUN4RCxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUM7b0JBQ2hDLGVBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUNuRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLFVBQVUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDNUYsTUFBTSxTQUFTLEdBQUcsVUFBaUIsQ0FBQztnQkFDcEMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLElBQUksSUFBSSxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ2pHLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUE0QixDQUFDO29CQUN4RCxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUM7b0JBQ2hDLGVBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUNuRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVksQ0FBQyxDQUFDO1lBQ25FLENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBRTlCLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDO2dCQUM1QixJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxLQUFLLENBQUM7Z0JBR3ZDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUM5RCxNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDcEUsQ0FBQztxQkFBTSxDQUFDO29CQUNOLE1BQU0sRUFBRSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQztnQkFDdkQsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEMsQ0FBQztpQkFBTSxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxDQUFDO2lCQUFNLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM5QixNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEMsQ0FBQztpQkFBTSxJQUFJLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFZLENBQUMsQ0FBQztZQUNsRSxDQUFDO2lCQUFNLElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUM3QixNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVksQ0FBQyxDQUFDO1lBQ2xFLENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBWSxDQUFDLENBQUM7WUFDbkUsQ0FBQztpQkFBTSxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFZLENBQUMsQ0FBQztZQUNuRSxDQUFDO2lCQUFNLENBQUM7Z0JBRU4sTUFBTSxFQUFFLEtBQUssQ0FBQyxnQ0FBZ0MsT0FBTyxNQUFNLENBQUMsQ0FBQztZQUMvRCxDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixlQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxNQUFNLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN0RSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO1lBQzVCLE1BQU0sRUFBRSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUNqRCxDQUFDO0lBQ0gsQ0FBQztJQUtPLG9CQUFvQixDQUFDLE1BQWtCO1FBQzdDLGVBQU0sQ0FBQyxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUV2RCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO1FBRW5DLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUN6QixlQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNwRSxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUN0QixlQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBT08sMkJBQTJCLENBQUMsTUFBa0IsRUFBRSxNQUFjO1FBQ3BFLGVBQU0sQ0FBQyxJQUFJLENBQUMsaURBQWlELE1BQU0saUJBQWlCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQzFHLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxLQUFLLENBQUM7UUFFdkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMzQixlQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxHQUFHLENBQUMsT0FBTyxpQkFBaUIsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDbkcsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDaEMsQ0FBQztZQUNELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDOUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDaEMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBR0gsSUFBSSxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLGlCQUFpQixLQUFLLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNyRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUM7UUFDOUIsZUFBTSxDQUFDLEtBQUssQ0FBQyx1REFBdUQsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFNTyxvQkFBb0IsQ0FBQyxNQUFjO1FBRXpDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoQyxlQUFNLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxNQUFNLHFCQUFxQixJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxlQUFlLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUM1TixJQUFJLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEIsT0FBTztRQUNULENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFFbEUsSUFDRSxJQUFJLENBQUMseUJBQXlCO2dCQUM5QixJQUFJLENBQUMsZUFBZSxLQUFLLElBQUk7Z0JBQzdCLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxNQUFNLEVBQ2pDLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLHlCQUF5QixHQUFHLEtBQUssQ0FBQztnQkFDdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUM7b0JBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNoQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzVCLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUM1RCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEMsQ0FBQztnQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNiLGVBQU0sQ0FBQyxLQUFLLENBQUMsNENBQTZDLENBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRixDQUFDO2dCQUNELElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFDaEQsZUFBTSxDQUFDLElBQUksQ0FBQywrQ0FBK0MsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNyRSxDQUFDO1lBQ0QsT0FBTztRQUNULENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7UUFDckMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUU7WUFDN0QsZUFBTSxDQUFDLElBQUksQ0FBQyxtREFBbUQsTUFBTSxDQUFDLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3RixJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUN2QixlQUFNLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUMzRSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUNoQyxDQUFDO1lBQ0QsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQU1PLFlBQVk7UUFDbEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLGVBQU0sQ0FBQyxLQUFLLENBQUMsNENBQTRDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMEJBQTBCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxrQkFBa0IsSUFBSSxDQUFDLGlCQUFpQixLQUFLLElBQUksU0FBUyxJQUFJLENBQUMsaUJBQWlCLEtBQUssSUFBSSxTQUFTLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzlQLE9BQU87UUFDVCxDQUFDO1FBR0QsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDckUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDdEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUM5QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVCLGVBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLElBQUksQ0FBQyxNQUFNLFFBQVEsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsaUJBQVMsQ0FBQyxRQUFRLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztZQUM5RSxDQUFDLENBQUMsQ0FBQztZQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU87UUFDVCxDQUFDO1FBR0QsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDckUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDdEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUM5QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBRTlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVCLGVBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDdEQsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdDLFVBQVUsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzdCLGVBQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxpQkFBUyxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN4RSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7Z0JBQ3pCLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLGlCQUFTLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ2hFLENBQUMsQ0FBQyxDQUFDO1lBQ0gsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QixPQUFPO1FBQ1QsQ0FBQztRQUdELElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLGlCQUFpQixLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3JFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQzVCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDOUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUU5QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM1QixlQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQyxXQUFXLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUM5QixlQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsaUJBQVMsQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztnQkFDdkUsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLENBQUMsQ0FBQyxDQUFDO1lBQ0gsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUM1QixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxpQkFBUyxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNoRSxDQUFDLENBQUMsQ0FBQztZQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDekIsT0FBTztRQUNULENBQUM7SUFHSCxDQUFDO0lBS08sa0JBQWtCLENBQUMsTUFBYztRQUN2QyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1QsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNuQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztZQUMxQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEUsT0FBTztZQUNULENBQUM7WUFDRCxNQUFNLE9BQU8sR0FDWCxJQUFJLENBQUMsaUJBQWlCLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLGlCQUFpQixLQUFLLElBQUksQ0FBQztZQUN4RyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLGlCQUFpQixLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzVILE9BQU87WUFDVCxDQUFDO1lBQ0QsZUFBTSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsTUFBTSw0QkFBNEIsQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxpQkFBUyxDQUFDLGdCQUFnQixFQUFFLDJDQUEyQyxDQUFDLENBQUM7UUFDckcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFLTyxvQkFBb0I7UUFDMUIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDdkIsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUM1QixDQUFDO0lBQ0gsQ0FBQztJQUtPLHFCQUFxQixDQUFDLE1BQWM7UUFDMUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDNUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDO0lBQ0gsQ0FBQztJQUtPLFlBQVksQ0FBQyxNQUFjLEVBQUUsSUFBWSxFQUFFLE9BQWU7UUFDaEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1lBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxJQUFJLE9BQU8sRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELENBQUM7SUFDSCxDQUFDO0lBSU0sZUFBZSxDQUFDLE1BQWMsRUFBRSxNQUFlO1FBRXBELElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDNUIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVCxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QixJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNiLGVBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLE1BQU0sYUFBYSxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQzVFLENBQUM7aUJBQU0sQ0FBQztnQkFDUixlQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztDQUNGOztBQS9wQnlCLDhCQUFvQixHQUFHLEtBQUssQUFBUixDQUFTIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgbmV0IGZyb20gJ25ldCc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0LCBTZXJ2ZXJDb25maWcgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBVc2VyTWFuYWdlciB9IGZyb20gJy4uL3VzZXJNYW5hZ2VyJztcbmltcG9ydCB7IG5vcm1hbGl6ZURpclBhdGgsIGVuc3VyZURpcmVjdG9yeUV4aXN0cyB9IGZyb20gJy4uL3V0aWxzL3BhdGhVdGlscyc7XG5pbXBvcnQgeyBMb2dnZXIsIExvZ0xldmVsIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcbmltcG9ydCAqIGFzIENvbW1hbmRzIGZyb20gJy4uL2NvbW1hbmRzJztcblxuLyoqXG4gKiBEZWZhdWx0IGF5YXJsYXJcbiAqL1xuY29uc3QgREVGQVVMVF9DT05GSUc6IFNlcnZlckNvbmZpZyA9IHtcbiAgcG9ydDogMjEsXG4gIGRhdGFQb3J0OiAyMCxcbiAgdXNlckZpbGU6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi91c2Vycy5qc29uJyksXG4gIG1heENvbm5lY3Rpb25zOiAxMDAsXG4gIGxvZ0xldmVsOiAnaW5mbycsXG4gIC8vIDIyMCBrYXLFn8SxbGFtYSBtZXNhasSxOyBib8WfIGLEsXJha8SxbMSxcnNhIFwiPHBvcnQ+IEZUUCBTZXJ2ZXIgUmVhZHlcIiDDvHJldGlsaXJcbiAgYmFubmVyOiAnJyxcbiAgLy8gUEFTViB2ZXJpIGJhxJ9sYW50xLEgcG9ydGxhcsSxIGJ1IGFyYWzEsWt0YW4gc2XDp2lsaXJcbiAgcGFzc2l2ZVBvcnRSYW5nZTogeyBtaW46IDUwMDAwLCBtYXg6IDUwMDUwIH0sXG59O1xuXG4vKipcbiAqIEZUUCBTdW51Y3VzdSBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgRnRwU2VydmVyIHtcbiAgcHJpdmF0ZSBzZXJ2ZXI6IG5ldC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkYXRhU2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGlvbnM6IE1hcDxzdHJpbmcsIEZ0cENvbm5lY3Rpb24+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGRhdGFDb25uZWN0aW9uczogTWFwPHN0cmluZywgYW55PiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBjb25maWc6IHR5cGVvZiBERUZBVUxUX0NPTkZJRztcbiAgcHJpdmF0ZSB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uQ291bnQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgbWF4Q29ubmVjdGlvbnM6IG51bWJlcjtcbiAgcHJpdmF0ZSBwYXNzaXZlTW9kZTogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIHBhc3NpdmVJcDogc3RyaW5nIHwgbnVsbCA9IG51bGw7IC8vIG51bGwgaXNlIHN1bnVjdW51biBrZW5kaW5lIHVsYcWfxLFsYWJpbGlyIElQIG90b21hdGlrIHNlw6dpbGlyXG4gIHByaXZhdGUgcGFzc2l2ZURhdGFTZXJ2ZXI6IG5ldC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwYXNzaXZlRGF0YVBvcnQ6IG51bWJlciA9IDUwMDAwO1xuICAvKiogUEFTViBwb3J0IGFyYWzEscSfxLEgw7x6ZXJpbmRlIGRvbGHFn2FuIGltbGXDpyAqL1xuICBwcml2YXRlIHBhc3NpdmVQb3J0Q3Vyc29yOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIHBlbmRpbmdMaXN0RGF0YTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ0xpc3RDb25uSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdSZXRyRmlsZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1JldHJDb25uSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdTdG9yRmlsZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1N0b3JDb25uSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAvKiogUGFzaWYgdmVyaSBiYWdsYW50aXNpIGFrdGFyaW0gYXRhbm1hZGFuIG9uY2Uga2FwYW5kaSAoZXJrZW4ga2FwYW5tYSkgKi9cbiAgcHJpdmF0ZSBkYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5OiBib29sZWFuID0gZmFsc2U7XG4gIC8qKiBLb250cm9sIGJhxJ9sYW50xLFzxLFuYSBnZWxlbiB5YXLEsW0gKHRhbWFtbGFubWFtxLHFnykga29tdXQgc2F0xLFybGFyxLEgKi9cbiAgcHJpdmF0ZSBpbnB1dEJ1ZmZlcnM6IE1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKCk7XG4gIC8qKiBCYcSfbGFudMSxIGJhxZ/EsW5hIGtvbXV0bGFyxLFuIHPEsXJheWxhIGnFn2xlbm1lc2kgacOnaW4ga3V5cnVrICovXG4gIHByaXZhdGUgY29tbWFuZFF1ZXVlczogTWFwPHN0cmluZywgUHJvbWlzZTx2b2lkPj4gPSBuZXcgTWFwKCk7XG4gIC8qKiBIZW7DvHoga3VsbGFuxLFsbWFtxLHFnyBwYXNpZi9ha3RpZiBkYXRhIGJhxJ9sYW50xLFzxLEgKi9cbiAgcHJpdmF0ZSBwZW5kaW5nRGF0YVNvY2tldDogbmV0LlNvY2tldCB8IG51bGwgPSBudWxsO1xuICAvKiogU29uIFBBU1Yga29tdXR1bnUgdmVyZW4gYmHEn2xhbnTEsSAoZGF0YSBiYcSfbGFudMSxc8SxIHNhaGliaSkgKi9cbiAgcHJpdmF0ZSBwYXNzaXZlQ29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgLyoqIDE1MCBnw7ZuZGVyaWxkaWt0ZW4gc29ucmEgdmVyaSBiYcSfbGFudMSxc8SxIGdlbG1lenNlIGFzxLFsxLEga2FsbWFtYWsgacOnaW4gemFtYW5sYXnEsWPEsSAqL1xuICBwcml2YXRlIGRhdGFXYWl0VGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG4gIC8qKiBWZXJpIGJhxJ9sYW50xLFzxLEgacOnaW4gYXphbWkgYmVrbGVtZSBzw7xyZXNpIChtcykgKi9cbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgREFUQV9XQUlUX1RJTUVPVVRfTVMgPSAxNTAwMDtcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFBhcnRpYWw8dHlwZW9mIERFRkFVTFRfQ09ORklHPiA9IHt9KSB7XG4gICAgdGhpcy5jb25maWcgPSB7IC4uLkRFRkFVTFRfQ09ORklHLCAuLi5jb25maWcgfSBhcyBTZXJ2ZXJDb25maWc7XG4gICAgdGhpcy5tYXhDb25uZWN0aW9ucyA9IHRoaXMuY29uZmlnLm1heENvbm5lY3Rpb25zIHx8IERFRkFVTFRfQ09ORklHLm1heENvbm5lY3Rpb25zO1xuICAgIC8vIEHDp8Sxa8OnYSB5YXDEsWxhbmTEsXLEsWxtxLHFnyBQQVNWIElQIHZhcnNhIGt1bGxhblxuICAgIGlmICh0eXBlb2YgdGhpcy5jb25maWcucGFzc2l2ZUlwID09PSAnc3RyaW5nJyAmJiB0aGlzLmNvbmZpZy5wYXNzaXZlSXAudHJpbSgpICE9PSAnJykge1xuICAgICAgdGhpcy5wYXNzaXZlSXAgPSB0aGlzLmNvbmZpZy5wYXNzaXZlSXAudHJpbSgpO1xuICAgIH1cblxuICAgIC8vIEJhbm5lcjogYm/FnyBixLFyYWvEsWzEsXJzYSBcIjxwb3J0PiBGVFAgU2VydmVyIFJlYWR5XCJcbiAgICBjb25zdCBiYW5uZXIgPSB0eXBlb2YgdGhpcy5jb25maWcuYmFubmVyID09PSAnc3RyaW5nJyA/IHRoaXMuY29uZmlnLmJhbm5lci50cmltKCkgOiAnJztcbiAgICB0aGlzLmNvbmZpZy5iYW5uZXIgPSBiYW5uZXIgIT09ICcnID8gYmFubmVyIDogYCR7dGhpcy5jb25maWcucG9ydH0gRlRQIFNlcnZlciBSZWFkeWA7XG5cbiAgICAvLyBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYVxuICAgIHRoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2UgPSB0aGlzLm5vcm1hbGl6ZVBvcnRSYW5nZSh0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlKTtcbiAgICAvLyBMb2dnZXIgc2V2aXllc2luaSBheWFybGFcbiAgICBsZXQgbG9nTGV2ZWxFbnVtOiBMb2dMZXZlbCA9IExvZ0xldmVsLklORk87XG4gICAgaWYgKHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSAnZGVidWcnKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5ERUJVRztcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSAnd2FybicpIHtcbiAgICAgIGxvZ0xldmVsRW51bSA9IExvZ0xldmVsLldBUk47XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5sb2dMZXZlbCA9PT0gJ2Vycm9yJykge1xuICAgICAgbG9nTGV2ZWxFbnVtID0gTG9nTGV2ZWwuRVJST1I7XG4gICAgfVxuICAgIExvZ2dlci5zZXRMZXZlbChsb2dMZXZlbEVudW0pO1xuICAgIC8vIFVzZXJNYW5hZ2VyJ8SxIGJhxZ9sYXRcbiAgICB0aGlzLnVzZXJNYW5hZ2VyID0gbmV3IFVzZXJNYW5hZ2VyKHRoaXMuY29uZmlnLnVzZXJGaWxlKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRlRQIHNlcnZlciBzdGFydGluZy4uLmApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb250cm9sIHBvcnQ6ICR7dGhpcy5jb25maWcucG9ydH1gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBwb3J0OiAke3RoaXMuY29uZmlnLmRhdGFQb3J0fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBNYXggY29ubmVjdGlvbnM6ICR7dGhpcy5tYXhDb25uZWN0aW9uc31gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQmFubmVyOiAke3RoaXMuY29uZmlnLmJhbm5lcn1gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUEFTViBwb3J0IHJhbmdlOiAke3RoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2UubWlufS0ke3RoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2UubWF4fWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFBBU1YgcG9ydCBhcmFsxLHEn8SxbsSxIGRvxJ9ydWxhOyBnZcOnZXJzaXpzZSB2YXJzYXnEsWxhbiBhcmFsxLHEn2EgZMO2blxuICAgKi9cbiAgcHJpdmF0ZSBub3JtYWxpemVQb3J0UmFuZ2UocmFuZ2U6IHsgbWluPzogbnVtYmVyOyBtYXg/OiBudW1iZXIgfSB8IHVuZGVmaW5lZCk6IHsgbWluOiBudW1iZXI7IG1heDogbnVtYmVyIH0ge1xuICAgIGNvbnN0IGZhbGxiYWNrID0geyAuLi5ERUZBVUxUX0NPTkZJRy5wYXNzaXZlUG9ydFJhbmdlIH07XG4gICAgaWYgKCFyYW5nZSkge1xuICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgIH1cbiAgICBjb25zdCBtaW4gPSBNYXRoLmZsb29yKE51bWJlcihyYW5nZS5taW4pKTtcbiAgICBjb25zdCBtYXggPSBNYXRoLmZsb29yKE51bWJlcihyYW5nZS5tYXgpKTtcbiAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShtaW4pIHx8ICFOdW1iZXIuaXNGaW5pdGUobWF4KSB8fCBtaW4gPCAxIHx8IG1heCA+IDY1NTM1IHx8IG1pbiA+IG1heCkge1xuICAgICAgTG9nZ2VyLndhcm4oYFtGdHBTZXJ2ZXJdIEludmFsaWQgUEFTViBwb3J0IHJhbmdlOiAke3JhbmdlLm1pbn0tJHtyYW5nZS5tYXh9LCB1c2luZyBkZWZhdWx0ICR7ZmFsbGJhY2subWlufS0ke2ZhbGxiYWNrLm1heH1gKTtcbiAgICAgIHJldHVybiBmYWxsYmFjaztcbiAgICB9XG4gICAgcmV0dXJuIHsgbWluLCBtYXggfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJUHY0LW1hcHBlZCBJUHY2ICg6OmZmZmY6eC54LngueCkgdmUgem9uZSBpZCAoJWV0aDApIGdpYmkgZWtsZXJpIHRlbWl6bGUuXG4gICAqL1xuICBwcml2YXRlIG5vcm1hbGl6ZUlwKGFkZHI6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBpZiAoIWFkZHIpIHJldHVybiBudWxsO1xuICAgIGxldCBpcCA9IGFkZHIudHJpbSgpO1xuICAgIGNvbnN0IHpvbmVJbmRleCA9IGlwLmluZGV4T2YoJyUnKTtcbiAgICBpZiAoem9uZUluZGV4ICE9PSAtMSkgaXAgPSBpcC5zbGljZSgwLCB6b25lSW5kZXgpO1xuICAgIGlmIChpcC50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJzo6ZmZmZjonKSkgaXAgPSBpcC5zbGljZSg3KTtcbiAgICByZXR1cm4gaXAgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiDEsHN0ZW1jaXllIGTDtm5kw7xyw7xsZWNlayBzdW51Y3VudW4ga2VuZGluZSB1bGHFn8SxbGFiaWxpciBJUHY0IGFkcmVzaW5pIGJlbGlybGUuXG4gICAqXG4gICAqIMOWTkVNTMSwOiBQQVNWIHlhbsSxdMSxIGlzdGVtY2luaW4gYmHEn2xhbmFjYcSfxLEgU1VOVUNVIGFkcmVzaW5pIGnDp2VybWVsaWRpci5cbiAgICogxLBzdGVtY2luaW4gKHJlbW90ZSkgYWRyZXNpIEFTTEEga3VsbGFuxLFsbWFtYWzEsWTEsXI7IGFrc2kgaGFsZGUgaXN0ZW1jaVxuICAgKiBrZW5kaSBtYWtpbmVzaW5lIGJhxJ9sYW5tYXlhIMOnYWzEscWfxLFyIHZlIEVDT05OUkVGVVNFRCBhbMSxci5cbiAgICpcbiAgICogw5ZuY2VsaWsgc8SxcmFzxLE6XG4gICAqICAgMS4gWWFwxLFsYW5kxLFybWFkYSBhw6fEsWvDp2EgdmVyaWxlbiBwYXNzaXZlSXAgKHZhcnNhIHZlIGxvb3BiYWNrIGRlxJ9pbHNlKVxuICAgKiAgIDIuIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW7EsW4geWVyZWwgYWRyZXNpIChpc3RlbWNpbmluIGJhxJ9sYW5kxLHEn8SxIGFyYXnDvHogSVAnc2kpXG4gICAqICAgMy4gxLBzdGVtY2kgaWxlIGF5bsSxIC8yNCBhbHQgYcSfxLFuZGEgb2xhbiBiaXIgeWVyZWwgYXJhecO8eiBhZHJlc2lcbiAgICogICA0LiDEsGxrIHV5Z3VuIChsb29wYmFjayBvbG1heWFuKSBJUHY0IGFyYXnDvHogYWRyZXNpXG4gICAqICAgNS4gU29uIMOnYXJlIG9sYXJhayAxMjcuMC4wLjFcbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVBhc3NpdmVJcChjbGllbnRTb2NrZXQ6IG5ldC5Tb2NrZXQpOiBzdHJpbmcge1xuICAgIC8vIDEuIEHDp8SxayB5YXDEsWxhbmTEsXJtYVxuICAgIGNvbnN0IGNvbmZpZ3VyZWQgPSB0aGlzLm5vcm1hbGl6ZUlwKHRoaXMucGFzc2l2ZUlwKTtcbiAgICBpZiAoY29uZmlndXJlZCAmJiBjb25maWd1cmVkICE9PSAnMTI3LjAuMC4xJyAmJiBjb25maWd1cmVkICE9PSAnMC4wLjAuMCcgJiYgY29uZmlndXJlZCAhPT0gJzo6MScpIHtcbiAgICAgIHJldHVybiBjb25maWd1cmVkO1xuICAgIH1cblxuICAgIC8vIDIuIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW7EsW4geWVyZWwgYWRyZXNpIChlbiBnw7x2ZW5pbGlyOiBpc3RlbWNpbmluIGJhxJ9sYW5kxLHEn8SxIElQKVxuICAgIGNvbnN0IGxvY2FsID0gdGhpcy5ub3JtYWxpemVJcChjbGllbnRTb2NrZXQ/LmxvY2FsQWRkcmVzcyk7XG4gICAgaWYgKGxvY2FsICYmIG5ldC5pc0lQdjQobG9jYWwpICYmIGxvY2FsICE9PSAnMTI3LjAuMC4xJyAmJiBsb2NhbCAhPT0gJzAuMC4wLjAnICYmIGxvY2FsICE9PSAnOjoxJykge1xuICAgICAgcmV0dXJuIGxvY2FsO1xuICAgIH1cblxuICAgIC8vIDMuIFNvbiDDp2FyZTogeWVyZWwgYmHEn2xhbnTEsSAobG9jYWxob3N0KSB2ZXlhIHRlc3BpdCBlZGlsZW1leWVuIGR1cnVtLlxuICAgIC8vIMOHb2tsdSBJUCdsaSB5YXDEsWxhcmRhIG90b21hdGlrIHNlw6dpbSBoYXRhbMSxIG9sYWJpbGVjZcSfaW5kZW4gYnVyYWRhIHRhaG1pblxuICAgIC8vIHlhcG3EsXlvcnV6OyBrdWxsYW7EsWPEsSBnZXJla2lyc2UgeWFwxLFsYW5kxLFybWFkYSBgcGFzc2l2ZUlwYCBpbGUgYcOnxLFrw6dhXG4gICAgLy8gYmVsaXJ0bWVsaWRpci5cbiAgICByZXR1cm4gJzEyNy4wLjAuMSc7XG4gIH1cblxuICAvKipcbiAgICogU3VudWN1bnVuIGRpbmxlZGnEn2kvYXJhecO8eiBJUCdzaW5pIGxvZ2xhbWFrIGnDp2luIHNlw6cgKGJpbGdpIGFtYcOnbMSxKS5cbiAgICogMC4wLjAuMCdhIGJpbmQgZWRpbGRpxJ9pbmRlIGlsayB1eWd1biAobG9vcGJhY2sgb2xtYXlhbikgSVB2NCBhZHJlc2kga3VsbGFuxLFsxLFyLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlTGlzdGVuSXAoKTogc3RyaW5nIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgaWZhY2VzID0gb3MubmV0d29ya0ludGVyZmFjZXMoKSBhcyBhbnk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoaWZhY2VzKSkge1xuICAgICAgICBjb25zdCBpZmFjZSA9IGlmYWNlc1tuYW1lXTtcbiAgICAgICAgaWYgKCFpZmFjZSkgY29udGludWU7XG4gICAgICAgIGZvciAoY29uc3QgaW5mbyBvZiBpZmFjZSkge1xuICAgICAgICAgIGNvbnN0IGZhbWlseSA9IHR5cGVvZiBpbmZvLmZhbWlseSA9PT0gJ3N0cmluZycgPyBpbmZvLmZhbWlseSA6IChpbmZvLmZhbWlseSA9PT0gNCA/ICdJUHY0JyA6ICdJUHY2Jyk7XG4gICAgICAgICAgaWYgKGZhbWlseSA9PT0gJ0lQdjQnICYmICFpbmZvLmludGVybmFsICYmIGluZm8uYWRkcmVzcyAmJiBpbmZvLmFkZHJlc3MgIT09ICcwLjAuMC4wJyAmJiBpbmZvLmFkZHJlc3MgIT09ICcxMjcuMC4wLjEnKSB7XG4gICAgICAgICAgICBjb25zdCBpcCA9IHRoaXMubm9ybWFsaXplSXAoaW5mby5hZGRyZXNzKTtcbiAgICAgICAgICAgIGlmIChpcCAmJiBuZXQuaXNJUHY0KGlwKSkgcmV0dXJuIGlwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIHlva3NheVxuICAgIH1cbiAgICByZXR1cm4gJzEyNy4wLjAuMSc7XG4gIH1cblxuICAvKipcbiAgICogUEFTViBwb3J0IGFyYWzEscSfxLFuZGFuIHPEsXJheWxhICh5dXZhcmxhayB1c3VsKSBiaXIgcG9ydCBzZcOnXG4gICAqL1xuICBwcml2YXRlIG5leHRQYXNzaXZlUG9ydCgpOiBudW1iZXIge1xuICAgIGNvbnN0IHsgbWluLCBtYXggfSA9IHRoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2U7XG4gICAgY29uc3Qgc3BhbiA9IG1heCAtIG1pbiArIDE7XG4gICAgY29uc3QgcG9ydCA9IG1pbiArICh0aGlzLnBhc3NpdmVQb3J0Q3Vyc29yICUgc3Bhbik7XG4gICAgdGhpcy5wYXNzaXZlUG9ydEN1cnNvciA9ICh0aGlzLnBhc3NpdmVQb3J0Q3Vyc29yICsgMSkgJSBzcGFuO1xuICAgIHJldHVybiBwb3J0O1xuICB9XG5cbiAgLyoqXG4gICAqIFBBU1YgcG9ydHVudSBkaW5sZW1leWUgYWwgKGRpbmxleWljaSB6YXRlbiBvIHBvcnR0YXlzYSB5ZW5pZGVuIGt1cnVsbWF6KS5cbiAgICogMjI3IHlhbsSxdMSxIGFuY2FrIHBvcnQgZ2Vyw6dla3RlbiBkaW5sZWRpa3RlbiBzb25yYSBnw7ZuZGVyaWxpci5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlUGFzc2l2ZUxpc3RlbmVyKHBvcnQ6IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLnBhc3NpdmVEYXRhU2VydmVyICYmIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIubGlzdGVuaW5nICYmIHRoaXMucGFzc2l2ZURhdGFQb3J0ID09PSBwb3J0KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBFc2tpIGRpbmxleWljaXlpIGthcGF0IChrYWJ1bCBlZGlsbWnFnyB2ZXJpIGJhxJ9sYW50xLFsYXLEsSBldGtpbGVubWV6KVxuICAgIGlmICh0aGlzLnBhc3NpdmVEYXRhU2VydmVyKSB7XG4gICAgICBjb25zdCBvbGRTZXJ2ZXIgPSB0aGlzLnBhc3NpdmVEYXRhU2VydmVyO1xuICAgICAgdGhpcy5wYXNzaXZlRGF0YVNlcnZlciA9IG51bGw7XG4gICAgICBvbGRTZXJ2ZXIuY2xvc2UoKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXIgPSBuZXQuY3JlYXRlU2VydmVyKChkYXRhU29ja2V0KSA9PiB7XG4gICAgICBjb25zdCBvd25lcklkID0gdGhpcy5wYXNzaXZlQ29ubklkIHx8ICcnO1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgZGF0YSBjb25uZWN0aW9uIGVzdGFibGlzaGVkOiBwb3J0ICR7cG9ydH0gKCR7b3duZXJJZH0pYCk7XG4gICAgICB0aGlzLmhhbmRsZVBhc3NpdmVEYXRhQ29ubmVjdGlvbihkYXRhU29ja2V0LCBvd25lcklkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgICAgc2VydmVyLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgcG9ydCAke3BvcnR9IGNhbm5vdCBvcGVuOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiB7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIgPSBzZXJ2ZXI7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFQb3J0ID0gcG9ydDtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgZGF0YSBzZXJ2ZXIgc3RhcnRlZDogcG9ydCAke3BvcnR9YCk7XG4gICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGVFAgc3VudWN1c3VudSBiYcWfbGF0XG4gICAqL1xuICBwdWJsaWMgc3RhcnQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoc29ja2V0KSA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlQ29ubmVjdGlvbihzb2NrZXQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc2VydmVyLmxpc3Rlbih0aGlzLmNvbmZpZy5wb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBGVFAgc2VydmVyIHN0YXJ0ZWQ6IGZ0cDovLyR7dGhpcy5yZXNvbHZlTGlzdGVuSXAoKX06JHt0aGlzLmNvbmZpZy5wb3J0fWApO1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gVXNlciBkYXRhOiAke3RoaXMuY29uZmlnLnVzZXJGaWxlfWApO1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29tbWFuZHM6IFVTRVIsIFBBU1MsIENXRCwgUFdELCBMSVNULCBSRVRSLCBTVE9SLCBERUxFLCBRVUlULCBOT09QYCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zZXJ2ZXIub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcnZlci5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBGVFAgc2VydmVyIGNsb3NlZGApO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIERhdGEgc2VydmVyIGJhxZ9sYXRcbiAgICAgIHRoaXMuZGF0YVNlcnZlciA9IG5ldC5jcmVhdGVTZXJ2ZXIoKGRhdGFTb2NrZXQpID0+IHtcbiAgICAgICAgdGhpcy5oYW5kbGVEYXRhQ29ubmVjdGlvbihkYXRhU29ja2V0KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmRhdGFTZXJ2ZXIubGlzdGVuKHRoaXMuY29uZmlnLmRhdGFQb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIHNlcnZlciBzdGFydGVkOiBwb3J0ICR7dGhpcy5jb25maWcuZGF0YVBvcnR9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5kYXRhU2VydmVyLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ1tGdHBTZXJ2ZXJdIFN0YXJ0dXAgZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBZZW5pIGJhxJ9sYW50xLF5xLEgacWfbGVcbiAgICovXG4gIHByaXZhdGUgaGFuZGxlQ29ubmVjdGlvbihzb2NrZXQ6IG5ldC5Tb2NrZXQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25uSWQgPSBgY29ubl8ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIE5ldyBjb25uZWN0aW9uOiAke2Nvbm5JZH0gKElQOiAke3NvY2tldC5yZW1vdGVBZGRyZXNzfSlgKTtcblxuICAgIC8vIE1ha3NpbXVtIGJhxJ9sYW50xLEga29udHJvbMO8XG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbkNvdW50ID49IHRoaXMubWF4Q29ubmVjdGlvbnMpIHtcbiAgICAgIHNvY2tldD8ud3JpdGUoYDUwMyBTZXJ2aWNlIG5vdCBhdmFpbGFibGVcXHJcXG5gKTtcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbm5lY3Rpb25Db3VudCsrO1xuXG4gICAgY29uc3QgY29ubmVjdGlvbjogRnRwQ29ubmVjdGlvbiA9IHtcbiAgICAgIHNvY2tldCxcbiAgICAgIHVzZXI6IG51bGwsXG4gICAgICBwYXNzOiBudWxsLFxuICAgICAgaG9tZURpcjogJycsXG4gICAgICBjdXJyZW50RGlyOiAnJyxcbiAgICAgIHBlcm1pc3Npb25zOiB7fSxcbiAgICAgIHRyYW5zZmVyTW9kZTogbnVsbCxcbiAgICAgIHRyYW5zZmVyU2l6ZTogMCxcbiAgICAgIGxhc3RSZXBseTogMCxcbiAgICAgIGxhc3RNZXNzYWdlOiAnJyxcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0aW9ucy5zZXQoY29ubklkLCBjb25uZWN0aW9uKTtcblxuICAgIC8vIEJhxJ9sYW50xLEgYmHFn2xhdG1hIG1lc2FqxLFcbiAgICBzb2NrZXQ/LndyaXRlKGAyMjAgJHt0aGlzLmNvbmZpZy5iYW5uZXJ9XFxyXFxuYCk7XG5cbiAgICAvLyBCYcSfbGFudMSxIG9sYXlsYXLEsVxuICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgIHRoaXMuaGFuZGxlQ29udHJvbERhdGEoY29ubklkLCBkYXRhKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gZXJyb3IgKCR7Y29ubklkfSk6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQsICdlcnJvcicpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIGNsb3NlZDogJHtjb25uSWR9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gdGltZW91dDogJHtjb25uSWR9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQsICd0aW1lb3V0Jyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgZ2VsZW4gdmVyaXlpIHNhdMSxciBzYXTEsXIgYXlyxLHFn3TEsXIuXG4gICAqIFRlayBwYWtldHRlIGJpcmRlbiDDp29rIGtvbXV0IGdlbGViaWxpciwgeWFyxLFtIGthbGFuIHNhdMSxciBzb25yYWtpIHBha2V0dGUgdGFtYW1sYW7EsXIuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZUNvbnRyb2xEYXRhKGNvbm5JZDogc3RyaW5nLCBkYXRhOiBCdWZmZXIpOiB2b2lkIHtcbiAgICBjb25zdCBidWZmZXIgPSAodGhpcy5pbnB1dEJ1ZmZlcnMuZ2V0KGNvbm5JZCkgfHwgJycpICsgZGF0YS50b1N0cmluZygndXRmLTgnKTtcbiAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgvXFxyXFxufFxcbnxcXHIvKTtcbiAgICAvLyBTb24gcGFyw6dhIHlhcsSxbSBzYXTEsXIgb2xhYmlsaXI6IGJpciBzb25yYWtpIHBha2V0ZSBrYWRhciBzYWtsYVxuICAgIHRoaXMuaW5wdXRCdWZmZXJzLnNldChjb25uSWQsIGxpbmVzLnBvcCgpID8/ICcnKTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgdGhpcy5lbnF1ZXVlQ29tbWFuZChjb25uSWQsIGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBLb211dGxhcsSxIGJhxJ9sYW50xLEgYmHFn8SxbmEgc8SxcmF5bGEgacWfbGUgKGFzeW5jIGtvbXV0bGFyIHPEsXJhecSxIGJvem1hc8SxbilcbiAgICovXG4gIHByaXZhdGUgZW5xdWV1ZUNvbW1hbmQoY29ubklkOiBzdHJpbmcsIGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy5jb21tYW5kUXVldWVzLmdldChjb25uSWQpIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGNvbnN0IG5leHQgPSBwcmV2aW91c1xuICAgICAgLnRoZW4oKCkgPT4gdGhpcy5wcm9jZXNzQ29tbWFuZChjb25uSWQsIGxpbmUpKVxuICAgICAgLmNhdGNoKChlcnIpID0+IExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQ29tbWFuZCBwcm9jZXNzaW5nIGZhaWxlZCAoJHtjb25uSWR9KTpgLCBlcnIpKTtcbiAgICB0aGlzLmNvbW1hbmRRdWV1ZXMuc2V0KGNvbm5JZCwgbmV4dCk7XG4gIH1cblxuICAvKipcbiAgICogVGVrIGJpciBrb211dCBzYXTEsXLEsW7EsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwcm9jZXNzQ29tbWFuZChjb25uSWQ6IHN0cmluZywgcmF3TGluZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgICAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICAgICAgaWYgKCFjb25uKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBub3QgZm91bmQ6ICR7Y29ubklkfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxpbmUgPSByYXdMaW5lLnRyaW0oKTtcbiAgICAgIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEtvbXV0dSBpbGsgYm/Fn2x1a3RhbiBiw7ZsOiBkb3N5YS8gZGl6aW4gYWRsYXLEsW5kYWtpIGJvxZ9sdWtsYXIga29ydW51clxuICAgICAgY29uc3Qgc2VwYXJhdG9ySW5kZXggPSBsaW5lLnNlYXJjaCgvXFxzLyk7XG4gICAgICBjb25zdCBjb21tYW5kID0gKHNlcGFyYXRvckluZGV4ID09PSAtMSA/IGxpbmUgOiBsaW5lLnNsaWNlKDAsIHNlcGFyYXRvckluZGV4KSkudG9VcHBlckNhc2UoKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBzZXBhcmF0b3JJbmRleCA9PT0gLTEgPyAnJyA6IGxpbmUuc2xpY2Uoc2VwYXJhdG9ySW5kZXgpLnRyaW0oKTtcblxuICAgICAgaWYgKGNvbW1hbmQgPT09ICdVU0VSJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVVc2VyKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUEFTUycpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUGFzcyhjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1FVSVQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVF1aXQoY29ubklkLCBjb25uLCAoaWQsIHJlYXNvbikgPT4gdGhpcy5jbG9zZUNvbm5lY3Rpb24oaWQsIHJlYXNvbikpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnTk9PUCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlTm9vcChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUFdEJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQd2QoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0NXRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlQ3dkKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnTElTVCcgfHwgY29tbWFuZCA9PT0gJ05MU1QnKSB7XG4gICAgICAgIGNvbnN0IGxpc3RSZXN1bHQgPSBhd2FpdCBDb21tYW5kcy5oYW5kbGVMaXN0KGNvbm5JZCwgY29ubiwgdGhpcy51c2VyTWFuYWdlciEsIHNvY2tldCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdE9iaiA9IGxpc3RSZXN1bHQgYXMgYW55O1xuICAgICAgICBpZiAocmVzdWx0T2JqICYmIHJlc3VsdE9iai5kYXRhICYmIHR5cGVvZiByZXN1bHRPYmouZGF0YSA9PT0gJ29iamVjdCcgJiYgcmVzdWx0T2JqLmRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBsaXN0RGF0YSA9IHJlc3VsdE9iai5kYXRhIGFzIHsgb3V0cHV0OiBzdHJpbmcsIGRpcmVjdG9yeTogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nTGlzdERhdGEgPSBsaXN0RGF0YS5vdXRwdXQ7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCA9IGNvbm5JZDtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTElTVCBkYXRhIHdhaXRpbmc6ICR7bGlzdERhdGEub3V0cHV0ID8gbGlzdERhdGEub3V0cHV0Lmxlbmd0aCA6IDB9IGJ5dGVzYCk7XG4gICAgICAgICAgdGhpcy5lbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdSRVRSJykge1xuICAgICAgICBjb25zdCByZXRyUmVzdWx0ID0gYXdhaXQgQ29tbWFuZHMuaGFuZGxlUmV0cihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhLCBzb2NrZXQpO1xuICAgICAgICBjb25zdCByZXN1bHRPYmogPSByZXRyUmVzdWx0IGFzIGFueTtcbiAgICAgICAgaWYgKHJlc3VsdE9iaiAmJiByZXN1bHRPYmouZGF0YSAmJiB0eXBlb2YgcmVzdWx0T2JqLmRhdGEgPT09ICdvYmplY3QnICYmIHJlc3VsdE9iai5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgcmV0ckRhdGEgPSByZXN1bHRPYmouZGF0YSBhcyB7IGZpbGVQYXRoOiBzdHJpbmcgfTtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IHJldHJEYXRhLmZpbGVQYXRoO1xuICAgICAgICAgIHRoaXMucGVuZGluZ1JldHJDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFJFVFIgZmlsZSB3YWl0aW5nOiAke3JldHJEYXRhLmZpbGVQYXRofWApO1xuICAgICAgICAgIHRoaXMuZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnU1RPUicpIHtcbiAgICAgICAgY29uc3Qgc3RvclJlc3VsdCA9IGF3YWl0IENvbW1hbmRzLmhhbmRsZVN0b3IoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISwgc29ja2V0KTtcbiAgICAgICAgY29uc3QgcmVzdWx0T2JqID0gc3RvclJlc3VsdCBhcyBhbnk7XG4gICAgICAgIGlmIChyZXN1bHRPYmogJiYgcmVzdWx0T2JqLmRhdGEgJiYgdHlwZW9mIHJlc3VsdE9iai5kYXRhID09PSAnb2JqZWN0JyAmJiByZXN1bHRPYmouZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHN0b3JEYXRhID0gcmVzdWx0T2JqLmRhdGEgYXMgeyBmaWxlUGF0aDogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBzdG9yRGF0YS5maWxlUGF0aDtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gY29ubklkO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTVE9SIGZpbGUgd2FpdGluZzogJHtzdG9yRGF0YS5maWxlUGF0aH1gKTtcbiAgICAgICAgICB0aGlzLmVuc3VyZURhdGFDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0RFTEUnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZURlbGUoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQQVNWJykge1xuICAgICAgICAvLyBQYXNpZiBtb2Q6IGRhdGEgYmHEn2xhbnTEsXPEsW7EsW4gc2FoaWJpIGJ1IGtvbXV0dSB2ZXJlbiBiYcSfbGFudMSxZMSxclxuICAgICAgICB0aGlzLnBhc3NpdmVDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFlhcMSxbGFuZMSxcsSxbGFuIGFyYWzEsWt0YW4gcG9ydCBzZcOnIHZlIGRpbmxlbWV5ZSBhbFxuICAgICAgICBjb25zdCBwb3J0ID0gdGhpcy5uZXh0UGFzc2l2ZVBvcnQoKTtcbiAgICAgICAgY29uc3QgbGlzdGVuaW5nID0gYXdhaXQgdGhpcy5lbnN1cmVQYXNzaXZlTGlzdGVuZXIocG9ydCk7XG4gICAgICAgIGlmIChsaXN0ZW5pbmcpIHtcbiAgICAgICAgICBjb25zdCBlZmZlY3RpdmVQYXNzaXZlSXAgPSB0aGlzLnJlc29sdmVQYXNzaXZlSXAoY29ubi5zb2NrZXQpO1xuICAgICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVBhc3YoY29ubklkLCBjb25uLCBlZmZlY3RpdmVQYXNzaXZlSXAsIHBvcnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNvY2tldD8ud3JpdGUoYDQyNSBDYW5ub3Qgb3BlbiBkYXRhIGNvbm5lY3Rpb25cXHJcXG5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUE9SVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUG9ydChjb25uLCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0ZFQVQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZUZlYXQoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1NZU1QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVN5c3QoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1RZUEUnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVR5cGUoY29ubiwgYXJncyk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdNS0QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZU1rZChjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JNRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm1kKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUk5GUicpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm5mcihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JOVE8nKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVJudG8oY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCaWxpbm1leWVuIGtvbXV0XG4gICAgICAgIHNvY2tldD8ud3JpdGUoYDUwMiBDb21tYW5kIG5vdCBpbXBsZW1lbnRlZDogJHtjb21tYW5kfVxcclxcbmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIERhdGEgcHJvY2Vzc2luZyBlcnJvciAoJHtjb25uSWR9KTpgLCBlcnJvcik7XG4gICAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICAgIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcXHJcXG5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVmVyaSBiYcSfbGFudMSxc8SxbsSxIGnFn2xlXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZURhdGFDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCk6IHZvaWQge1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWRgKTtcbiAgICAvLyBEYXRhIGNvbm5lY3Rpb24gacOnaW4gacWfbGVtbGVyXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgLy8gRGF0YSB0cmFuc2ZlciBpxZ9sZW1sZXJpXG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIERhdGEgY29ubmVjdGlvbiBjbG9zZWRgKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEYXRhIGJhxJ9sYW50xLFzxLFuxLEgKFBBU1YvUE9SVCkga2FidWwgZXQgdmUgYmVrbGV5ZW4gYWt0YXLEsW3EsSBiYcSfbGEuXG4gICAqIFZlcmkgYWt0YXLEsW3EsSBrb211dCAoTElTVC9SRVRSL1NUT1IpIGdlbGRpxJ9pbmRlIGJhxZ9sYXI7IGlzdGVtY2kgdmVyaVxuICAgKiBiYcSfbGFudMSxc8SxbsSxIGtvbXV0dGFuIMO2bmNlIGHDp3TEscSfxLFuZGEgYmHEn2xhbnTEsSBiZWtsZXRpbGlyLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oc29ja2V0OiBuZXQuU29ja2V0LCBjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBQYXNzaXZlIGRhdGEgY29ubmVjdGlvbiBhY2NlcHRlZDogJHtjb25uSWR9IChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSBmYWxzZTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9IChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsIChoYWRFcnJvcikgPT4ge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPT09IHNvY2tldCkge1xuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSB0cnVlO1xuICAgICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEF5bsSxIGFuZGEgeWFsbsSxemNhIGJpciBkYXRhIGJhxJ9sYW50xLFzxLEga3VsbGFuxLFsxLFyXG4gICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgJiYgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCAhPT0gc29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95KCk7XG4gICAgfVxuICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBzb2NrZXQ7XG4gICAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIHBlbmRpbmdEYXRhU29ja2V0IGFzc2lnbmVkIChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICB0aGlzLnRyeVNlcnZlRGF0YSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIExJU1QvUkVUUi9TVE9SIGnDp2luIHZlcmkgYmHEn2xhbnTEsXPEsW7EsSBoYXrEsXJsYTpcbiAgICogcGFzaWYgbW9kZGEgaXN0ZW1jaW5pbiBiYcSfbGFubWFzxLEgYmVrbGVuaXIsIGFrdGlmIG1vZGRhIChQT1JUKSBzdW51Y3UgYmHEn2xhbsSxci5cbiAgICovXG4gIHByaXZhdGUgZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAvLyAxNTAnZGVuIHNvbnJhIGlzdGVtY2lkZSBzb25zdXogYmVrbGVtZSBvbG1hc8SxbjogZW4gZmF6IERBVEFfV0FJVF9USU1FT1VUX01TIGJla2xlXG4gICAgdGhpcy5hcm1EYXRhV2FpdFRpbWVvdXQoY29ubklkKTtcbiAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIGVuc3VyZURhdGFDb25uZWN0aW9uKCR7Y29ubklkfSk6IHBlbmRpbmcgc29ja2V0ICR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldCA/IGBleGlzdHMgKHJlbW90ZSBwb3J0ICR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldC5yZW1vdGVQb3J0fSwgZGVzdHJveWVkPSR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95ZWR9KWAgOiAnbm9uZSd9YCk7XG4gICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgJiYgIXRoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICB0aGlzLnRyeVNlcnZlRGF0YSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgIGlmICghY29ubiB8fCBjb25uLmRhdGFNb2RlICE9PSAnYWN0aXZlJyB8fCAhY29ubi5hY3RpdmVEYXRhVGFyZ2V0KSB7XG4gICAgICAvLyBQYXNpZiBtb2Q6IGlzdGVtY2luaW4gYmFnbGFubWFzaSBiZWtsZW5pclxuICAgICAgaWYgKFxuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgJiZcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgIT09IG51bGwgJiZcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9PT0gY29ubklkXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBlbmRpbmdTdG9yRmlsZTtcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gbnVsbDtcbiAgICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhdGhNb2QgPSByZXF1aXJlKCdwYXRoJyk7XG4gICAgICAgICAgY29uc3QgZnNNb2QgPSByZXF1aXJlKCdmcycpO1xuICAgICAgICAgIGZzTW9kLm1rZGlyU3luYyhwYXRoTW9kLmRpcm5hbWUoZmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIGZzTW9kLndyaXRlRmlsZVN5bmMoZmlsZSwgJycpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gU1RPUiBlYXJseSBjbG9zZSBmaWxlIGVycm9yOiAkeyhlIGFzIEVycm9yKS5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgMjI2LCAnU3RvciBjb21wbGV0ZScpO1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUiBjb21wbGV0ZWQgdmlhIGVhcmx5IGNsb3NlOiAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gY29ubi5hY3RpdmVEYXRhVGFyZ2V0O1xuICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHRhcmdldC5wb3J0LCB0YXJnZXQuaXAsICgpID0+IHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEFjdGl2ZSBkYXRhIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWQ6ICR7dGFyZ2V0LmlwfToke3RhcmdldC5wb3J0fWApO1xuICAgICAgdGhpcy5oYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oc29ja2V0LCBjb25uSWQpO1xuICAgIH0pO1xuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQWN0aXZlIGRhdGEgY29ubmVjdGlvbiBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEJla2xleWVuIExJU1QvUkVUUi9TVE9SIGFrdGFyxLFtxLFuxLEsIHZlcmkgYmHEn2xhbnTEsXPEsSBoYXrEsXJzYSBiYcWfbGF0LlxuICAgKiAyMjYgeWFuxLF0xLFuxLEgdmVyaSBnZXLDp2VrdGVuIGfDtm5kZXJpbGRpa3RlbiAvIGFsxLFuZMSxa3RhbiBzb25yYSBnw7ZuZGVyLlxuICAgKi9cbiAgcHJpdmF0ZSB0cnlTZXJ2ZURhdGEoKTogdm9pZCB7XG4gICAgY29uc3Qgc29ja2V0ID0gdGhpcy5wZW5kaW5nRGF0YVNvY2tldDtcbiAgICBpZiAoIXNvY2tldCB8fCBzb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIHRyeVNlcnZlRGF0YSBza2lwcGVkOiBzb2NrZXQgJHtzb2NrZXQgPyBgZGVzdHJveWVkIChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgIDogJ25vbmUnfSwgcGVuZGluZyBMSVNUPSR7dGhpcy5wZW5kaW5nTGlzdENvbm5JZCAhPT0gbnVsbH0gUkVUUj0ke3RoaXMucGVuZGluZ1JldHJDb25uSWQgIT09IG51bGx9IFNUT1I9JHt0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIExJU1QgLyBOTFNUXG4gICAgaWYgKHRoaXMucGVuZGluZ0xpc3REYXRhICE9PSBudWxsICYmIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnBlbmRpbmdMaXN0RGF0YTtcbiAgICAgIGNvbnN0IGNvbm5JZCA9IHRoaXMucGVuZGluZ0xpc3RDb25uSWQ7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0RGF0YSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0Q29ubklkID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTElTVCBkYXRhIHNlbmRpbmc6ICR7ZGF0YS5sZW5ndGh9IGJ5dGVzYCk7XG4gICAgICBzb2NrZXQub25jZSgnZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5MSVNUX0VORCwgJ0RpcmVjdG9yeSBsaXN0aW5nIGNvbXBsZXRlJyk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC53cml0ZShkYXRhLCAoKSA9PiBzb2NrZXQuZW5kKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFJFVFJcbiAgICBpZiAodGhpcy5wZW5kaW5nUmV0ckZpbGUgIT09IG51bGwgJiYgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMucGVuZGluZ1JldHJGaWxlO1xuICAgICAgY29uc3QgY29ubklkID0gdGhpcy5wZW5kaW5nUmV0ckNvbm5JZDtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJGaWxlID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJDb25uSWQgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG5cbiAgICAgIHRoaXMuY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBSRVRSIGZpbGUgc2VuZGluZzogJHtmaWxlfWApO1xuICAgICAgY29uc3QgcmVhZFN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZSk7XG4gICAgICByZWFkU3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBSRVRSIHJlYWQgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLkZJTEVfTk9UX0ZPVU5ELCAnQ2Fubm90IHJlYWQgZmlsZScpO1xuICAgICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQub25jZSgnZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5SRVRSX09LLCAnUmV0ciBjb21wbGV0ZScpO1xuICAgICAgfSk7XG4gICAgICByZWFkU3RyZWFtLnBpcGUoc29ja2V0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTVE9SXG4gICAgaWYgKHRoaXMucGVuZGluZ1N0b3JGaWxlICE9PSBudWxsICYmIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBlbmRpbmdTdG9yRmlsZTtcbiAgICAgIGNvbnN0IGNvbm5JZCA9IHRoaXMucGVuZGluZ1N0b3JDb25uSWQ7XG4gICAgICB0aGlzLnBlbmRpbmdTdG9yRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUiBmaWxlIHJlY2VpdmluZzogJHtmaWxlfWApO1xuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKTtcbiAgICAgIHdyaXRlU3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTVE9SIHdyaXRlIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5JTlRFUk5BTF9FUlIsICdDYW5ub3Qgd3JpdGUgZmlsZScpO1xuICAgICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgICB3cml0ZVN0cmVhbS5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5TVE9SX09LLCAnU3RvciBjb21wbGV0ZScpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQucGlwZSh3cml0ZVN0cmVhbSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSGVuw7x6IGJla2xleWVuIGFrdGFyxLFtIHlvazogYmHEn2xhbnTEsSBiaXIgc29ucmFraSBrb211dCBpw6dpbiBhw6fEsWsgdHV0dWx1clxuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsSBiZWtsZW1lIHphbWFubGF5xLFjxLFzxLFuxLEgYmHFn2xhdCAoaWtpbmNpIGtleiBiYcWfbGF0xLFsbWF6KVxuICAgKi9cbiAgcHJpdmF0ZSBhcm1EYXRhV2FpdFRpbWVvdXQoY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kYXRhV2FpdFRpbWVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGF0YVdhaXRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5kYXRhV2FpdFRpbWVyID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgICByZXR1cm47IC8vIHZlcmkgYmHEn2xhbnTEsXPEsSBoYXrEsXIsIHNvcnVuIHlva1xuICAgICAgfVxuICAgICAgY29uc3QgcGVuZGluZyA9XG4gICAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwgfHwgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbCB8fCB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsO1xuICAgICAgaWYgKCFwZW5kaW5nIHx8IHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IGNvbm5JZCAmJiB0aGlzLnBlbmRpbmdSZXRyQ29ubklkICE9PSBjb25uSWQgJiYgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCAhPT0gY29ubklkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIExvZ2dlci53YXJuKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gdGltZW91dDogJHtjb25uSWR9IChubyBjb25uZWN0aW9uIGFmdGVyIDE1MClgKTtcbiAgICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG4gICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5UUkFOU0ZFUl9BQk9SVEVELCAnVHJhbnNmZXIgYWJvcnRlZDogZGF0YSBjb25uZWN0aW9uIHRpbWVvdXQnKTtcbiAgICB9LCBGdHBTZXJ2ZXIuREFUQV9XQUlUX1RJTUVPVVRfTVMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsSBiZWtsZW1lIHphbWFubGF5xLFjxLFzxLFuxLEgaXB0YWwgZXRcbiAgICovXG4gIHByaXZhdGUgY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGF0YVdhaXRUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGF0YVdhaXRUaW1lcik7XG4gICAgICB0aGlzLmRhdGFXYWl0VGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCYcSfbGFudMSxbsSxbiBiZWtsZXllbiBha3RhcsSxbcSxbsSxIHRlbWl6bGUgKHllbmkgUEFTViBnZWxpbmNlIGVza2lzaSBnZcOnZXJzaXogb2x1cilcbiAgICovXG4gIHByaXZhdGUgY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgIGlmICh0aGlzLnBlbmRpbmdMaXN0Q29ubklkID09PSBjb25uSWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3REYXRhID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9PT0gY29ubklkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyQ29ubklkID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW5hIHlhbsSxdCBnw7ZuZGVyXG4gICAqL1xuICBwcml2YXRlIHdyaXRlQ29udHJvbChjb25uSWQ6IHN0cmluZywgY29kZTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubiAmJiBjb25uLnNvY2tldCkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBjb2RlO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICBjb25uLnNvY2tldC53cml0ZShgJHtjb2RlfSAke21lc3NhZ2V9YCArICdcXHJcXG4nKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEJhxJ9sYW50xLF5xLEga2FwYXRcbiAgICovXG4gIHB1YmxpYyBjbG9zZUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xuICAgIC8vIEJhxJ9sYW50xLF5YSBhaXQgdGFtcG9uLCBrdXlydWsgdmUgYmVrbGV5ZW4gYWt0YXLEsW0ga2F5xLF0bGFyxLFuxLEgdGVtaXpsZVxuICAgIHRoaXMuaW5wdXRCdWZmZXJzLmRlbGV0ZShjb25uSWQpO1xuICAgIHRoaXMuY29tbWFuZFF1ZXVlcy5kZWxldGUoY29ubklkKTtcbiAgICB0aGlzLmNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQpO1xuICAgIGlmICh0aGlzLnBhc3NpdmVDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wYXNzaXZlQ29ubklkID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubikge1xuICAgICAgY29ubi5zb2NrZXQ/LmVuZCgpO1xuICAgICAgdGhpcy5jb25uZWN0aW9ucy5kZWxldGUoY29ubklkKTtcbiAgICAgIHRoaXMuY29ubmVjdGlvbkNvdW50LS07XG4gICAgICBpZiAocmVhc29uKSB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBjbG9zZWQ6ICR7Y29ubklkfSAocmVhc29uOiAke3JlYXNvbn0pYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gY2xvc2VkOiAke2Nvbm5JZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==