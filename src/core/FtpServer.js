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
        this.serverIp = null;
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
        const configuredServerIp = this.normalizeIp(this.config.ip);
        if (configuredServerIp && configuredServerIp !== '127.0.0.1' && configuredServerIp !== '0.0.0.0') {
            this.serverIp = configuredServerIp;
        }
        if (typeof this.config.passiveIp === 'string' && this.config.passiveIp.trim() !== '') {
            this.passiveIp = this.config.passiveIp.trim();
        }
        else if (this.serverIp) {
            this.passiveIp = this.serverIp;
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
        logger_1.Logger.info(`[FtpServer] Server IP: ${this.serverIp ?? 'auto (all interfaces)'}`);
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
            server.listen({ port, host: this.serverIp ?? undefined }, () => {
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
            this.server.listen({ port: this.config.port, host: this.serverIp ?? undefined }, () => {
                logger_1.Logger.info(`[FtpServer] FTP server started: ftp://${this.serverIp ?? this.resolveListenIp()}:${this.config.port}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnRwU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvRnRwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLEdBQUcsZ0NBQVk7QUFDM0IsTUFBWSxFQUFFLCtCQUFXO0FBQ3pCLE1BQVksSUFBSSxpQ0FBYTtBQUM3QixvQ0FBaUY7QUFDakYsZ0RBQTZDO0FBRTdDLDRDQUFtRDtBQUNuRCxNQUFZLFFBQVEsd0NBQW9CO0FBS3hDLE1BQU0sY0FBYyxHQUFpQjtJQUNuQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0lBQ1osUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQztJQUMvQyxjQUFjLEVBQUUsR0FBRztJQUNuQixRQUFRLEVBQUUsTUFBTTtJQUVoQixNQUFNLEVBQUUsRUFBRTtJQUVWLGdCQUFnQixFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFO0NBQzdDLENBQUM7QUFLRjtJQXFDRSxZQUFZLE1BQU0sR0FBbUMsRUFBRTtRQXBDL0MsV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUFzQixJQUFJLENBQUM7UUFDckMsZ0JBQVcsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNwRCxvQkFBZSxHQUFxQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRTlDLGdCQUFXLEdBQXVCLElBQUksQ0FBQztRQUN2QyxvQkFBZSxHQUFXLENBQUMsQ0FBQztRQUU1QixnQkFBVyxHQUFZLEtBQUssQ0FBQztRQUM3QixjQUFTLEdBQWtCLElBQUksQ0FBQztRQUNoQyxhQUFRLEdBQWtCLElBQUksQ0FBQztRQUMvQixzQkFBaUIsR0FBc0IsSUFBSSxDQUFDO1FBQzVDLG9CQUFlLEdBQVcs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cG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCwgU2VydmVyQ29uZmlnIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyBub3JtYWxpemVEaXJQYXRoLCBlbnN1cmVEaXJlY3RvcnlFeGlzdHMgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuaW1wb3J0IHsgTG9nZ2VyLCBMb2dMZXZlbCB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgKiBhcyBDb21tYW5kcyBmcm9tICcuLi9jb21tYW5kcyc7XG5cbi8qKlxuICogRGVmYXVsdCBheWFybGFyXG4gKi9cbmNvbnN0IERFRkFVTFRfQ09ORklHOiBTZXJ2ZXJDb25maWcgPSB7XG4gIHBvcnQ6IDIxLFxuICBkYXRhUG9ydDogMjAsXG4gIHVzZXJGaWxlOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vdXNlcnMuanNvbicpLFxuICBtYXhDb25uZWN0aW9uczogMTAwLFxuICBsb2dMZXZlbDogJ2luZm8nLFxuICAvLyAyMjAga2FyxZ/EsWxhbWEgbWVzYWrEsTsgYm/FnyBixLFyYWvEsWzEsXJzYSBcIjxwb3J0PiBGVFAgU2VydmVyIFJlYWR5XCIgw7xyZXRpbGlyXG4gIGJhbm5lcjogJycsXG4gIC8vIFBBU1YgdmVyaSBiYcSfbGFudMSxIHBvcnRsYXLEsSBidSBhcmFsxLFrdGFuIHNlw6dpbGlyXG4gIHBhc3NpdmVQb3J0UmFuZ2U6IHsgbWluOiA1MDAwMCwgbWF4OiA1MDA1MCB9LFxufTtcblxuLyoqXG4gKiBGVFAgU3VudWN1c3UgY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIEZ0cFNlcnZlciB7XG4gIHByaXZhdGUgc2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGF0YVNlcnZlcjogbmV0LlNlcnZlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNvbm5lY3Rpb25zOiBNYXA8c3RyaW5nLCBGdHBDb25uZWN0aW9uPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBkYXRhQ29ubmVjdGlvbnM6IE1hcDxzdHJpbmcsIGFueT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgY29uZmlnOiB0eXBlb2YgREVGQVVMVF9DT05GSUc7XG4gIHByaXZhdGUgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGlvbkNvdW50OiBudW1iZXIgPSAwO1xuICBwcml2YXRlIG1heENvbm5lY3Rpb25zOiBudW1iZXI7XG4gIHByaXZhdGUgcGFzc2l2ZU1vZGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBwYXNzaXZlSXA6IHN0cmluZyB8IG51bGwgPSBudWxsOyAvLyBudWxsIGlzZSBzdW51Y3VudW4ga2VuZGluZSB1bGHFn8SxbGFiaWxpciBJUCBvdG9tYXRpayBzZcOnaWxpclxuICBwcml2YXRlIHNlcnZlcklwOiBzdHJpbmcgfCBudWxsID0gbnVsbDsgLy8gQXlhcmxhbmFuIHN1bnVjdSBJUDsgbnVsbCBpc2UgZGlubGVtZSBhZHJlc2kgb3RvbWF0aWsgc2VjaWxpclxuICBwcml2YXRlIHBhc3NpdmVEYXRhU2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGFzc2l2ZURhdGFQb3J0OiBudW1iZXIgPSA1MDAwMDtcbiAgLyoqIFBBU1YgcG9ydCBhcmFsxLHEn8SxIMO8emVyaW5kZSBkb2xhxZ9hbiBpbWxlw6cgKi9cbiAgcHJpdmF0ZSBwYXNzaXZlUG9ydEN1cnNvcjogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBwZW5kaW5nTGlzdERhdGE6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdMaXN0Q29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nUmV0ckZpbGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdSZXRyQ29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nU3RvckZpbGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdTdG9yQ29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgLyoqIFBhc2lmIHZlcmkgYmFnbGFudGlzaSBha3RhcmltIGF0YW5tYWRhbiBvbmNlIGthcGFuZGkgKGVya2VuIGthcGFubWEpICovXG4gIHByaXZhdGUgZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseTogYm9vbGVhbiA9IGZhbHNlO1xuICAvKiogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgZ2VsZW4geWFyxLFtICh0YW1hbWxhbm1hbcSxxZ8pIGtvbXV0IHNhdMSxcmxhcsSxICovXG4gIHByaXZhdGUgaW5wdXRCdWZmZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpO1xuICAvKiogQmHEn2xhbnTEsSBiYcWfxLFuYSBrb211dGxhcsSxbiBzxLFyYXlsYSBpxZ9sZW5tZXNpIGnDp2luIGt1eXJ1ayAqL1xuICBwcml2YXRlIGNvbW1hbmRRdWV1ZXM6IE1hcDxzdHJpbmcsIFByb21pc2U8dm9pZD4+ID0gbmV3IE1hcCgpO1xuICAvKiogSGVuw7x6IGt1bGxhbsSxbG1hbcSxxZ8gcGFzaWYvYWt0aWYgZGF0YSBiYcSfbGFudMSxc8SxICovXG4gIHByaXZhdGUgcGVuZGluZ0RhdGFTb2NrZXQ6IG5ldC5Tb2NrZXQgfCBudWxsID0gbnVsbDtcbiAgLyoqIFNvbiBQQVNWIGtvbXV0dW51IHZlcmVuIGJhxJ9sYW50xLEgKGRhdGEgYmHEn2xhbnTEsXPEsSBzYWhpYmkpICovXG4gIHByaXZhdGUgcGFzc2l2ZUNvbm5JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIC8qKiAxNTAgZ8O2bmRlcmlsZGlrdGVuIHNvbnJhIHZlcmkgYmHEn2xhbnTEsXPEsSBnZWxtZXpzZSBhc8SxbMSxIGthbG1hbWFrIGnDp2luIHphbWFubGF5xLFjxLEgKi9cbiAgcHJpdmF0ZSBkYXRhV2FpdFRpbWVyOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xuICAvKiogVmVyaSBiYcSfbGFudMSxc8SxIGnDp2luIGF6YW1pIGJla2xlbWUgc8O8cmVzaSAobXMpICovXG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERBVEFfV0FJVF9USU1FT1VUX01TID0gMTUwMDA7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBQYXJ0aWFsPHR5cGVvZiBERUZBVUxUX0NPTkZJRz4gPSB7fSkge1xuICAgIHRoaXMuY29uZmlnID0geyAuLi5ERUZBVUxUX0NPTkZJRywgLi4uY29uZmlnIH0gYXMgU2VydmVyQ29uZmlnO1xuICAgIHRoaXMubWF4Q29ubmVjdGlvbnMgPSB0aGlzLmNvbmZpZy5tYXhDb25uZWN0aW9ucyB8fCBERUZBVUxUX0NPTkZJRy5tYXhDb25uZWN0aW9ucztcbiAgICAvLyBTdW51Y3UgSVA6IGJpbmQgYWRyZXNpIHZlIFBBU1YgeWFuxLF0xLFuZGEga3VsbGFuxLFsYWNhayBhZHJlc1xuICAgIGNvbnN0IGNvbmZpZ3VyZWRTZXJ2ZXJJcCA9IHRoaXMubm9ybWFsaXplSXAodGhpcy5jb25maWcuaXApO1xuICAgIGlmIChjb25maWd1cmVkU2VydmVySXAgJiYgY29uZmlndXJlZFNlcnZlcklwICE9PSAnMTI3LjAuMC4xJyAmJiBjb25maWd1cmVkU2VydmVySXAgIT09ICcwLjAuMC4wJykge1xuICAgICAgdGhpcy5zZXJ2ZXJJcCA9IGNvbmZpZ3VyZWRTZXJ2ZXJJcDtcbiAgICB9XG5cbiAgICAvLyBBw6fEsWvDp2EgeWFwxLFsYW5kxLFyxLFsbcSxxZ8gUEFTViBJUCB5b2tzYSwgc3VudWN1IElQIGt1bGxhblxuICAgIGlmICh0eXBlb2YgdGhpcy5jb25maWcucGFzc2l2ZUlwID09PSAnc3RyaW5nJyAmJiB0aGlzLmNvbmZpZy5wYXNzaXZlSXAudHJpbSgpICE9PSAnJykge1xuICAgICAgdGhpcy5wYXNzaXZlSXAgPSB0aGlzLmNvbmZpZy5wYXNzaXZlSXAudHJpbSgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zZXJ2ZXJJcCkge1xuICAgICAgdGhpcy5wYXNzaXZlSXAgPSB0aGlzLnNlcnZlcklwO1xuICAgIH1cblxuICAgIC8vIEJhbm5lcjogYm/FnyBixLFyYWvEsWzEsXJzYSBcIjxwb3J0PiBGVFAgU2VydmVyIFJlYWR5XCJcbiAgICBjb25zdCBiYW5uZXIgPSB0eXBlb2YgdGhpcy5jb25maWcuYmFubmVyID09PSAnc3RyaW5nJyA/IHRoaXMuY29uZmlnLmJhbm5lci50cmltKCkgOiAnJztcbiAgICB0aGlzLmNvbmZpZy5iYW5uZXIgPSBiYW5uZXIgIT09ICcnID8gYmFubmVyIDogYCR7dGhpcy5jb25maWcucG9ydH0gRlRQIFNlcnZlciBSZWFkeWA7XG5cbiAgICAvLyBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYVxuICAgIHRoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2UgPSB0aGlzLm5vcm1hbGl6ZVBvcnRSYW5nZSh0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlKTtcbiAgICAvLyBMb2dnZXIgc2V2aXllc2luaSBheWFybGFcbiAgICBsZXQgbG9nTGV2ZWxFbnVtOiBMb2dMZXZlbCA9IExvZ0xldmVsLklORk87XG4gICAgaWYgKHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSAnZGVidWcnKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5ERUJVRztcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLmxvZ0xldmVsID09PSAnd2FybicpIHtcbiAgICAgIGxvZ0xldmVsRW51bSA9IExvZ0xldmVsLldBUk47XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5sb2dMZXZlbCA9PT0gJ2Vycm9yJykge1xuICAgICAgbG9nTGV2ZWxFbnVtID0gTG9nTGV2ZWwuRVJST1I7XG4gICAgfVxuICAgIExvZ2dlci5zZXRMZXZlbChsb2dMZXZlbEVudW0pO1xuICAgIC8vIFVzZXJNYW5hZ2VyJ8SxIGJhxZ9sYXRcbiAgICB0aGlzLnVzZXJNYW5hZ2VyID0gbmV3IFVzZXJNYW5hZ2VyKHRoaXMuY29uZmlnLnVzZXJGaWxlKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRlRQIHNlcnZlciBzdGFydGluZy4uLmApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb250cm9sIHBvcnQ6ICR7dGhpcy5jb25maWcucG9ydH1gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBwb3J0OiAke3RoaXMuY29uZmlnLmRhdGFQb3J0fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBNYXggY29ubmVjdGlvbnM6ICR7dGhpcy5tYXhDb25uZWN0aW9uc31gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQmFubmVyOiAke3RoaXMuY29uZmlnLmJhbm5lcn1gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUEFTViBwb3J0IHJhbmdlOiAke3RoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2UubWlufS0ke3RoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2UubWF4fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTZXJ2ZXIgSVA6ICR7dGhpcy5zZXJ2ZXJJcCA/PyAnYXV0byAoYWxsIGludGVyZmFjZXMpJ31gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYTsgZ2XDp2Vyc2l6c2UgdmFyc2F5xLFsYW4gYXJhbMSxxJ9hIGTDtm5cbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplUG9ydFJhbmdlKHJhbmdlOiB7IG1pbj86IG51bWJlcjsgbWF4PzogbnVtYmVyIH0gfCB1bmRlZmluZWQpOiB7IG1pbjogbnVtYmVyOyBtYXg6IG51bWJlciB9IHtcbiAgICBjb25zdCBmYWxsYmFjayA9IHsgLi4uREVGQVVMVF9DT05GSUcucGFzc2l2ZVBvcnRSYW5nZSB9O1xuICAgIGlmICghcmFuZ2UpIHtcbiAgICAgIHJldHVybiBmYWxsYmFjaztcbiAgICB9XG4gICAgY29uc3QgbWluID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWluKSk7XG4gICAgY29uc3QgbWF4ID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWF4KSk7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobWluKSB8fCAhTnVtYmVyLmlzRmluaXRlKG1heCkgfHwgbWluIDwgMSB8fCBtYXggPiA2NTUzNSB8fCBtaW4gPiBtYXgpIHtcbiAgICAgIExvZ2dlci53YXJuKGBbRnRwU2VydmVyXSBJbnZhbGlkIFBBU1YgcG9ydCByYW5nZTogJHtyYW5nZS5taW59LSR7cmFuZ2UubWF4fSwgdXNpbmcgZGVmYXVsdCAke2ZhbGxiYWNrLm1pbn0tJHtmYWxsYmFjay5tYXh9YCk7XG4gICAgICByZXR1cm4gZmFsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiB7IG1pbiwgbWF4IH07XG4gIH1cblxuICAvKipcbiAgICogSVB2NC1tYXBwZWQgSVB2NiAoOjpmZmZmOngueC54LngpIHZlIHpvbmUgaWQgKCVldGgwKSBnaWJpIGVrbGVyaSB0ZW1pemxlLlxuICAgKi9cbiAgcHJpdmF0ZSBub3JtYWxpemVJcChhZGRyOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgaWYgKCFhZGRyKSByZXR1cm4gbnVsbDtcbiAgICBsZXQgaXAgPSBhZGRyLnRyaW0oKTtcbiAgICBjb25zdCB6b25lSW5kZXggPSBpcC5pbmRleE9mKCclJyk7XG4gICAgaWYgKHpvbmVJbmRleCAhPT0gLTEpIGlwID0gaXAuc2xpY2UoMCwgem9uZUluZGV4KTtcbiAgICBpZiAoaXAudG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKCc6OmZmZmY6JykpIGlwID0gaXAuc2xpY2UoNyk7XG4gICAgcmV0dXJuIGlwIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogxLBzdGVtY2l5ZSBkw7ZuZMO8csO8bGVjZWsgc3VudWN1bnVuIGtlbmRpbmUgdWxhxZ/EsWxhYmlsaXIgSVB2NCBhZHJlc2luaSBiZWxpcmxlLlxuICAgKlxuICAgKiDDlk5FTUzEsDogUEFTViB5YW7EsXTEsSBpc3RlbWNpbmluIGJhxJ9sYW5hY2HEn8SxIFNVTlVDVSBhZHJlc2luaSBpw6dlcm1lbGlkaXIuXG4gICAqIMSwc3RlbWNpbmluIChyZW1vdGUpIGFkcmVzaSBBU0xBIGt1bGxhbsSxbG1hbWFsxLFkxLFyOyBha3NpIGhhbGRlIGlzdGVtY2lcbiAgICoga2VuZGkgbWFraW5lc2luZSBiYcSfbGFubWF5YSDDp2FsxLHFn8SxciB2ZSBFQ09OTlJFRlVTRUQgYWzEsXIuXG4gICAqXG4gICAqIMOWbmNlbGlrIHPEsXJhc8SxOlxuICAgKiAgIDEuIFlhcMSxbGFuZMSxcm1hZGEgYcOnxLFrw6dhIHZlcmlsZW4gcGFzc2l2ZUlwICh2YXJzYSB2ZSBsb29wYmFjayBkZcSfaWxzZSlcbiAgICogICAyLiBLb250cm9sIGJhxJ9sYW50xLFzxLFuxLFuIHllcmVsIGFkcmVzaSAoaXN0ZW1jaW5pbiBiYcSfbGFuZMSxxJ/EsSBhcmF5w7x6IElQJ3NpKVxuICAgKiAgIDMuIMSwc3RlbWNpIGlsZSBheW7EsSAvMjQgYWx0IGHEn8SxbmRhIG9sYW4gYmlyIHllcmVsIGFyYXnDvHogYWRyZXNpXG4gICAqICAgNC4gxLBsayB1eWd1biAobG9vcGJhY2sgb2xtYXlhbikgSVB2NCBhcmF5w7x6IGFkcmVzaVxuICAgKiAgIDUuIFNvbiDDp2FyZSBvbGFyYWsgMTI3LjAuMC4xXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVQYXNzaXZlSXAoY2xpZW50U29ja2V0OiBuZXQuU29ja2V0KTogc3RyaW5nIHtcbiAgICAvLyAxLiBBw6fEsWsgeWFwxLFsYW5kxLFybWFcbiAgICBjb25zdCBjb25maWd1cmVkID0gdGhpcy5ub3JtYWxpemVJcCh0aGlzLnBhc3NpdmVJcCk7XG4gICAgaWYgKGNvbmZpZ3VyZWQgJiYgY29uZmlndXJlZCAhPT0gJzEyNy4wLjAuMScgJiYgY29uZmlndXJlZCAhPT0gJzAuMC4wLjAnICYmIGNvbmZpZ3VyZWQgIT09ICc6OjEnKSB7XG4gICAgICByZXR1cm4gY29uZmlndXJlZDtcbiAgICB9XG5cbiAgICAvLyAyLiBLb250cm9sIGJhxJ9sYW50xLFzxLFuxLFuIHllcmVsIGFkcmVzaSAoZW4gZ8O8dmVuaWxpcjogaXN0ZW1jaW5pbiBiYcSfbGFuZMSxxJ/EsSBJUClcbiAgICBjb25zdCBsb2NhbCA9IHRoaXMubm9ybWFsaXplSXAoY2xpZW50U29ja2V0Py5sb2NhbEFkZHJlc3MpO1xuICAgIGlmIChsb2NhbCAmJiBuZXQuaXNJUHY0KGxvY2FsKSAmJiBsb2NhbCAhPT0gJzEyNy4wLjAuMScgJiYgbG9jYWwgIT09ICcwLjAuMC4wJyAmJiBsb2NhbCAhPT0gJzo6MScpIHtcbiAgICAgIHJldHVybiBsb2NhbDtcbiAgICB9XG5cbiAgICAvLyAzLiBTb24gw6dhcmU6IHllcmVsIGJhxJ9sYW50xLEgKGxvY2FsaG9zdCkgdmV5YSB0ZXNwaXQgZWRpbGVtZXllbiBkdXJ1bS5cbiAgICAvLyDDh29rbHUgSVAnbGkgeWFwxLFsYXJkYSBvdG9tYXRpayBzZcOnaW0gaGF0YWzEsSBvbGFiaWxlY2XEn2luZGVuIGJ1cmFkYSB0YWhtaW5cbiAgICAvLyB5YXBtxLF5b3J1ejsga3VsbGFuxLFjxLEgZ2VyZWtpcnNlIHlhcMSxbGFuZMSxcm1hZGEgYHBhc3NpdmVJcGAgaWxlIGHDp8Sxa8OnYVxuICAgIC8vIGJlbGlydG1lbGlkaXIuXG4gICAgcmV0dXJuICcxMjcuMC4wLjEnO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1bnVjdW51biBkaW5sZWRpxJ9pL2FyYXnDvHogSVAnc2luaSBsb2dsYW1hayBpw6dpbiBzZcOnIChiaWxnaSBhbWHDp2zEsSkuXG4gICAqIDAuMC4wLjAnYSBiaW5kIGVkaWxkacSfaW5kZSBpbGsgdXlndW4gKGxvb3BiYWNrIG9sbWF5YW4pIElQdjQgYWRyZXNpIGt1bGxhbsSxbMSxci5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZUxpc3RlbklwKCk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlmYWNlcyA9IG9zLm5ldHdvcmtJbnRlcmZhY2VzKCkgYXMgYW55O1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGlmYWNlcykpIHtcbiAgICAgICAgY29uc3QgaWZhY2UgPSBpZmFjZXNbbmFtZV07XG4gICAgICAgIGlmICghaWZhY2UpIGNvbnRpbnVlO1xuICAgICAgICBmb3IgKGNvbnN0IGluZm8gb2YgaWZhY2UpIHtcbiAgICAgICAgICBjb25zdCBmYW1pbHkgPSB0eXBlb2YgaW5mby5mYW1pbHkgPT09ICdzdHJpbmcnID8gaW5mby5mYW1pbHkgOiAoaW5mby5mYW1pbHkgPT09IDQgPyAnSVB2NCcgOiAnSVB2NicpO1xuICAgICAgICAgIGlmIChmYW1pbHkgPT09ICdJUHY0JyAmJiAhaW5mby5pbnRlcm5hbCAmJiBpbmZvLmFkZHJlc3MgJiYgaW5mby5hZGRyZXNzICE9PSAnMC4wLjAuMCcgJiYgaW5mby5hZGRyZXNzICE9PSAnMTI3LjAuMC4xJykge1xuICAgICAgICAgICAgY29uc3QgaXAgPSB0aGlzLm5vcm1hbGl6ZUlwKGluZm8uYWRkcmVzcyk7XG4gICAgICAgICAgICBpZiAoaXAgJiYgbmV0LmlzSVB2NChpcCkpIHJldHVybiBpcDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB5b2tzYXlcbiAgICB9XG4gICAgcmV0dXJuICcxMjcuMC4wLjEnO1xuICB9XG5cbiAgLyoqXG4gICAqIFBBU1YgcG9ydCBhcmFsxLHEn8SxbmRhbiBzxLFyYXlsYSAoeXV2YXJsYWsgdXN1bCkgYmlyIHBvcnQgc2XDp1xuICAgKi9cbiAgcHJpdmF0ZSBuZXh0UGFzc2l2ZVBvcnQoKTogbnVtYmVyIHtcbiAgICBjb25zdCB7IG1pbiwgbWF4IH0gPSB0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlO1xuICAgIGNvbnN0IHNwYW4gPSBtYXggLSBtaW4gKyAxO1xuICAgIGNvbnN0IHBvcnQgPSBtaW4gKyAodGhpcy5wYXNzaXZlUG9ydEN1cnNvciAlIHNwYW4pO1xuICAgIHRoaXMucGFzc2l2ZVBvcnRDdXJzb3IgPSAodGhpcy5wYXNzaXZlUG9ydEN1cnNvciArIDEpICUgc3BhbjtcbiAgICByZXR1cm4gcG9ydDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQQVNWIHBvcnR1bnUgZGlubGVtZXllIGFsIChkaW5sZXlpY2kgemF0ZW4gbyBwb3J0dGF5c2EgeWVuaWRlbiBrdXJ1bG1heikuXG4gICAqIDIyNyB5YW7EsXTEsSBhbmNhayBwb3J0IGdlcsOnZWt0ZW4gZGlubGVkaWt0ZW4gc29ucmEgZ8O2bmRlcmlsaXIuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGVuc3VyZVBhc3NpdmVMaXN0ZW5lcihwb3J0OiBudW1iZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5wYXNzaXZlRGF0YVNlcnZlciAmJiB0aGlzLnBhc3NpdmVEYXRhU2VydmVyLmxpc3RlbmluZyAmJiB0aGlzLnBhc3NpdmVEYXRhUG9ydCA9PT0gcG9ydCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRXNraSBkaW5sZXlpY2l5aSBrYXBhdCAoa2FidWwgZWRpbG1pxZ8gdmVyaSBiYcSfbGFudMSxbGFyxLEgZXRraWxlbm1leilcbiAgICBpZiAodGhpcy5wYXNzaXZlRGF0YVNlcnZlcikge1xuICAgICAgY29uc3Qgb2xkU2VydmVyID0gdGhpcy5wYXNzaXZlRGF0YVNlcnZlcjtcbiAgICAgIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIgPSBudWxsO1xuICAgICAgb2xkU2VydmVyLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoZGF0YVNvY2tldCkgPT4ge1xuICAgICAgY29uc3Qgb3duZXJJZCA9IHRoaXMucGFzc2l2ZUNvbm5JZCB8fCAnJztcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBQYXNzaXZlIGRhdGEgY29ubmVjdGlvbiBlc3RhYmxpc2hlZDogcG9ydCAke3BvcnR9ICgke293bmVySWR9KWApO1xuICAgICAgdGhpcy5oYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oZGF0YVNvY2tldCwgb3duZXJJZCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICAgIHNlcnZlci5vbmNlKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBQYXNzaXZlIHBvcnQgJHtwb3J0fSBjYW5ub3Qgb3BlbjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG4gICAgICB9KTtcbiAgICAgIHNlcnZlci5saXN0ZW4oeyBwb3J0LCBob3N0OiB0aGlzLnNlcnZlcklwID8/IHVuZGVmaW5lZCB9LCAoKSA9PiB7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIgPSBzZXJ2ZXI7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFQb3J0ID0gcG9ydDtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgZGF0YSBzZXJ2ZXIgc3RhcnRlZDogcG9ydCAke3BvcnR9YCk7XG4gICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGVFAgc3VudWN1c3VudSBiYcWfbGF0XG4gICAqL1xuICBwdWJsaWMgc3RhcnQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoc29ja2V0KSA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlQ29ubmVjdGlvbihzb2NrZXQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEF5YXJsYW5hbiBJUCB2YXJzYSBvIElQJ3lpIGRpbmxlLCB5b2tzYSB0w7xtIGludGVyZmFjZXJpICgwLjAuMC4wKSBkaW5sZVxuICAgICAgdGhpcy5zZXJ2ZXIubGlzdGVuKFxuICAgICAgICB7IHBvcnQ6IHRoaXMuY29uZmlnLnBvcnQsIGhvc3Q6IHRoaXMuc2VydmVySXAgPz8gdW5kZWZpbmVkIH0sXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRlRQIHNlcnZlciBzdGFydGVkOiBmdHA6Ly8ke3RoaXMuc2VydmVySXAgPz8gdGhpcy5yZXNvbHZlTGlzdGVuSXAoKX06JHt0aGlzLmNvbmZpZy5wb3J0fWApO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBVc2VyIGRhdGE6ICR7dGhpcy5jb25maWcudXNlckZpbGV9YCk7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbW1hbmRzOiBVU0VSLCBQQVNTLCBDV0QsIFBXRCwgTElTVCwgUkVUUiwgU1RPUiwgREVMRSwgUVVJVCwgTk9PUGApO1xuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICB0aGlzLnNlcnZlci5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gU2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc2VydmVyLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEZUUCBzZXJ2ZXIgY2xvc2VkYCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gRGF0YSBzZXJ2ZXIgYmHFn2xhdFxuICAgICAgdGhpcy5kYXRhU2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoZGF0YVNvY2tldCkgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZURhdGFDb25uZWN0aW9uKGRhdGFTb2NrZXQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuZGF0YVNlcnZlci5saXN0ZW4odGhpcy5jb25maWcuZGF0YVBvcnQsICgpID0+IHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIERhdGEgc2VydmVyIHN0YXJ0ZWQ6IHBvcnQgJHt0aGlzLmNvbmZpZy5kYXRhUG9ydH1gKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmRhdGFTZXJ2ZXIub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIERhdGEgc2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIExvZ2dlci5lcnJvcignW0Z0cFNlcnZlcl0gU3RhcnR1cCBlcnJvcjonLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFllbmkgYmHEn2xhbnTEsXnEsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbm5JZCA9IGBjb25uXyR7RGF0ZS5ub3coKX1fJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTmV3IGNvbm5lY3Rpb246ICR7Y29ubklkfSAoSVA6ICR7c29ja2V0LnJlbW90ZUFkZHJlc3N9KWApO1xuXG4gICAgLy8gTWFrc2ltdW0gYmHEn2xhbnTEsSBrb250cm9sw7xcbiAgICBpZiAodGhpcy5jb25uZWN0aW9uQ291bnQgPj0gdGhpcy5tYXhDb25uZWN0aW9ucykge1xuICAgICAgc29ja2V0Py53cml0ZShgNTAzIFNlcnZpY2Ugbm90IGF2YWlsYWJsZVxcclxcbmApO1xuICAgICAgc29ja2V0LmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGlvbkNvdW50Kys7XG5cbiAgICBjb25zdCBjb25uZWN0aW9uOiBGdHBDb25uZWN0aW9uID0ge1xuICAgICAgc29ja2V0LFxuICAgICAgdXNlcjogbnVsbCxcbiAgICAgIHBhc3M6IG51bGwsXG4gICAgICBob21lRGlyOiAnJyxcbiAgICAgIGN1cnJlbnREaXI6ICcnLFxuICAgICAgcGVybWlzc2lvbnM6IHt9LFxuICAgICAgdHJhbnNmZXJNb2RlOiBudWxsLFxuICAgICAgdHJhbnNmZXJTaXplOiAwLFxuICAgICAgbGFzdFJlcGx5OiAwLFxuICAgICAgbGFzdE1lc3NhZ2U6ICcnLFxuICAgIH07XG5cbiAgICB0aGlzLmNvbm5lY3Rpb25zLnNldChjb25uSWQsIGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gQmHEn2xhbnTEsSBiYcWfbGF0bWEgbWVzYWrEsVxuICAgIHNvY2tldD8ud3JpdGUoYDIyMCAke3RoaXMuY29uZmlnLmJhbm5lcn1cXHJcXG5gKTtcblxuICAgIC8vIEJhxJ9sYW50xLEgb2xheWxhcsSxXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgdGhpcy5oYW5kbGVDb250cm9sRGF0YShjb25uSWQsIGRhdGEpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBlcnJvciAoJHtjb25uSWR9KTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKGNvbm5JZCwgJ2Vycm9yJyk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gY2xvc2VkOiAke2Nvbm5JZH1gKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ3RpbWVvdXQnLCAoKSA9PiB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiB0aW1lb3V0OiAke2Nvbm5JZH1gKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKGNvbm5JZCwgJ3RpbWVvdXQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLb250cm9sIGJhxJ9sYW50xLFzxLFuYSBnZWxlbiB2ZXJpeWkgc2F0xLFyIHNhdMSxciBheXLEscWfdMSxci5cbiAgICogVGVrIHBha2V0dGUgYmlyZGVuIMOnb2sga29tdXQgZ2VsZWJpbGlyLCB5YXLEsW0ga2FsYW4gc2F0xLFyIHNvbnJha2kgcGFrZXR0ZSB0YW1hbWxhbsSxci5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlQ29udHJvbERhdGEoY29ubklkOiBzdHJpbmcsIGRhdGE6IEJ1ZmZlcik6IHZvaWQge1xuICAgIGNvbnN0IGJ1ZmZlciA9ICh0aGlzLmlucHV0QnVmZmVycy5nZXQoY29ubklkKSB8fCAnJykgKyBkYXRhLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KC9cXHJcXG58XFxufFxcci8pO1xuICAgIC8vIFNvbiBwYXLDp2EgeWFyxLFtIHNhdMSxciBvbGFiaWxpcjogYmlyIHNvbnJha2kgcGFrZXRlIGthZGFyIHNha2xhXG4gICAgdGhpcy5pbnB1dEJ1ZmZlcnMuc2V0KGNvbm5JZCwgbGluZXMucG9wKCkgPz8gJycpO1xuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICB0aGlzLmVucXVldWVDb21tYW5kKGNvbm5JZCwgbGluZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEtvbXV0bGFyxLEgYmHEn2xhbnTEsSBiYcWfxLFuYSBzxLFyYXlsYSBpxZ9sZSAoYXN5bmMga29tdXRsYXIgc8SxcmF5xLEgYm96bWFzxLFuKVxuICAgKi9cbiAgcHJpdmF0ZSBlbnF1ZXVlQ29tbWFuZChjb25uSWQ6IHN0cmluZywgbGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLmNvbW1hbmRRdWV1ZXMuZ2V0KGNvbm5JZCkgfHwgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgY29uc3QgbmV4dCA9IHByZXZpb3VzXG4gICAgICAudGhlbigoKSA9PiB0aGlzLnByb2Nlc3NDb21tYW5kKGNvbm5JZCwgbGluZSkpXG4gICAgICAuY2F0Y2goKGVycikgPT4gTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBDb21tYW5kIHByb2Nlc3NpbmcgZmFpbGVkICgke2Nvbm5JZH0pOmAsIGVycikpO1xuICAgIHRoaXMuY29tbWFuZFF1ZXVlcy5zZXQoY29ubklkLCBuZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZWsgYmlyIGtvbXV0IHNhdMSxcsSxbsSxIGnFn2xlXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHByb2Nlc3NDb21tYW5kKGNvbm5JZDogc3RyaW5nLCByYXdMaW5lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29ubiA9IHRoaXMuY29ubmVjdGlvbnMuZ2V0KGNvbm5JZCk7XG4gICAgICBjb25zdCBzb2NrZXQgPSBjb25uPy5zb2NrZXQ7XG4gICAgICBpZiAoIWNvbm4pIHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIG5vdCBmb3VuZDogJHtjb25uSWR9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbGluZSA9IHJhd0xpbmUudHJpbSgpO1xuICAgICAgaWYgKGxpbmUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gS29tdXR1IGlsayBib8WfbHVrdGFuIGLDtmw6IGRvc3lhLyBkaXppbiBhZGxhcsSxbmRha2kgYm/Fn2x1a2xhciBrb3J1bnVyXG4gICAgICBjb25zdCBzZXBhcmF0b3JJbmRleCA9IGxpbmUuc2VhcmNoKC9cXHMvKTtcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSAoc2VwYXJhdG9ySW5kZXggPT09IC0xID8gbGluZSA6IGxpbmUuc2xpY2UoMCwgc2VwYXJhdG9ySW5kZXgpKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgY29uc3QgYXJncyA9IHNlcGFyYXRvckluZGV4ID09PSAtMSA/ICcnIDogbGluZS5zbGljZShzZXBhcmF0b3JJbmRleCkudHJpbSgpO1xuXG4gICAgICBpZiAoY29tbWFuZCA9PT0gJ1VTRVInKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVVzZXIoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQQVNTJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQYXNzKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUVVJVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUXVpdChjb25uSWQsIGNvbm4sIChpZCwgcmVhc29uKSA9PiB0aGlzLmNsb3NlQ29ubmVjdGlvbihpZCwgcmVhc29uKSk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdOT09QJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVOb29wKGNvbm5JZCwgY29ubik7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQV0QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVB3ZChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnQ1dEJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVDd2QoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdMSVNUJyB8fCBjb21tYW5kID09PSAnTkxTVCcpIHtcbiAgICAgICAgY29uc3QgbGlzdFJlc3VsdCA9IGF3YWl0IENvbW1hbmRzLmhhbmRsZUxpc3QoY29ubklkLCBjb25uLCB0aGlzLnVzZXJNYW5hZ2VyISwgc29ja2V0KTtcbiAgICAgICAgY29uc3QgcmVzdWx0T2JqID0gbGlzdFJlc3VsdCBhcyBhbnk7XG4gICAgICAgIGlmIChyZXN1bHRPYmogJiYgcmVzdWx0T2JqLmRhdGEgJiYgdHlwZW9mIHJlc3VsdE9iai5kYXRhID09PSAnb2JqZWN0JyAmJiByZXN1bHRPYmouZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGxpc3REYXRhID0gcmVzdWx0T2JqLmRhdGEgYXMgeyBvdXRwdXQ6IHN0cmluZywgZGlyZWN0b3J5OiBzdHJpbmcgfTtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdMaXN0RGF0YSA9IGxpc3REYXRhLm91dHB1dDtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdMaXN0Q29ubklkID0gY29ubklkO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBMSVNUIGRhdGEgd2FpdGluZzogJHtsaXN0RGF0YS5vdXRwdXQgPyBsaXN0RGF0YS5vdXRwdXQubGVuZ3RoIDogMH0gYnl0ZXNgKTtcbiAgICAgICAgICB0aGlzLmVuc3VyZURhdGFDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JFVFInKSB7XG4gICAgICAgIGNvbnN0IHJldHJSZXN1bHQgPSBhd2FpdCBDb21tYW5kcy5oYW5kbGVSZXRyKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEsIHNvY2tldCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdE9iaiA9IHJldHJSZXN1bHQgYXMgYW55O1xuICAgICAgICBpZiAocmVzdWx0T2JqICYmIHJlc3VsdE9iai5kYXRhICYmIHR5cGVvZiByZXN1bHRPYmouZGF0YSA9PT0gJ29iamVjdCcgJiYgcmVzdWx0T2JqLmRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICBjb25zdCByZXRyRGF0YSA9IHJlc3VsdE9iai5kYXRhIGFzIHsgZmlsZVBhdGg6IHN0cmluZyB9O1xuICAgICAgICAgIHRoaXMucGVuZGluZ1JldHJGaWxlID0gcmV0ckRhdGEuZmlsZVBhdGg7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9IGNvbm5JZDtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUkVUUiBmaWxlIHdhaXRpbmc6ICR7cmV0ckRhdGEuZmlsZVBhdGh9YCk7XG4gICAgICAgICAgdGhpcy5lbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdTVE9SJykge1xuICAgICAgICBjb25zdCBzdG9yUmVzdWx0ID0gYXdhaXQgQ29tbWFuZHMuaGFuZGxlU3Rvcihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhLCBzb2NrZXQpO1xuICAgICAgICBjb25zdCByZXN1bHRPYmogPSBzdG9yUmVzdWx0IGFzIGFueTtcbiAgICAgICAgaWYgKHJlc3VsdE9iaiAmJiByZXN1bHRPYmouZGF0YSAmJiB0eXBlb2YgcmVzdWx0T2JqLmRhdGEgPT09ICdvYmplY3QnICYmIHJlc3VsdE9iai5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3Qgc3RvckRhdGEgPSByZXN1bHRPYmouZGF0YSBhcyB7IGZpbGVQYXRoOiBzdHJpbmcgfTtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdTdG9yRmlsZSA9IHN0b3JEYXRhLmZpbGVQYXRoO1xuICAgICAgICAgIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFNUT1IgZmlsZSB3YWl0aW5nOiAke3N0b3JEYXRhLmZpbGVQYXRofWApO1xuICAgICAgICAgIHRoaXMuZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnREVMRScpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlRGVsZShjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1BBU1YnKSB7XG4gICAgICAgIC8vIFBhc2lmIG1vZDogZGF0YSBiYcSfbGFudMSxc8SxbsSxbiBzYWhpYmkgYnUga29tdXR1IHZlcmVuIGJhxJ9sYW50xLFkxLFyXG4gICAgICAgIHRoaXMucGFzc2l2ZUNvbm5JZCA9IGNvbm5JZDtcbiAgICAgICAgdGhpcy5jbGVhclBlbmRpbmdUcmFuc2ZlcnMoY29ubklkKTtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gZmFsc2U7XG5cbiAgICAgICAgLy8gWWFwxLFsYW5kxLFyxLFsYW4gYXJhbMSxa3RhbiBwb3J0IHNlw6cgdmUgZGlubGVtZXllIGFsXG4gICAgICAgIGNvbnN0IHBvcnQgPSB0aGlzLm5leHRQYXNzaXZlUG9ydCgpO1xuICAgICAgICBjb25zdCBsaXN0ZW5pbmcgPSBhd2FpdCB0aGlzLmVuc3VyZVBhc3NpdmVMaXN0ZW5lcihwb3J0KTtcbiAgICAgICAgaWYgKGxpc3RlbmluZykge1xuICAgICAgICAgIGNvbnN0IGVmZmVjdGl2ZVBhc3NpdmVJcCA9IHRoaXMucmVzb2x2ZVBhc3NpdmVJcChjb25uLnNvY2tldCk7XG4gICAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUGFzdihjb25uSWQsIGNvbm4sIGVmZmVjdGl2ZVBhc3NpdmVJcCwgcG9ydCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc29ja2V0Py53cml0ZShgNDI1IENhbm5vdCBvcGVuIGRhdGEgY29ubmVjdGlvblxcclxcbmApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQT1JUJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQb3J0KGNvbm4sIGFyZ3MpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnRkVBVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlRmVhdChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnU1lTVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlU3lzdChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnVFlQRScpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlVHlwZShjb25uLCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ01LRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlTWtkKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUk1EJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVSbWQoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdSTkZSJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVSbmZyKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUk5UTycpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm50byhjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJpbGlubWV5ZW4ga29tdXRcbiAgICAgICAgc29ja2V0Py53cml0ZShgNTAyIENvbW1hbmQgbm90IGltcGxlbWVudGVkOiAke2NvbW1hbmR9XFxyXFxuYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gRGF0YSBwcm9jZXNzaW5nIGVycm9yICgke2Nvbm5JZH0pOmAsIGVycm9yKTtcbiAgICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgICAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICAgICAgc29ja2V0Py53cml0ZShgNTAwIEludGVybmFsIHNlcnZlciBlcnJvclxcclxcbmApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpIGJhxJ9sYW50xLFzxLFuxLEgacWfbGVcbiAgICovXG4gIHByaXZhdGUgaGFuZGxlRGF0YUNvbm5lY3Rpb24oc29ja2V0OiBuZXQuU29ja2V0KTogdm9pZCB7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIERhdGEgY29ubmVjdGlvbiBlc3RhYmxpc2hlZGApO1xuICAgIC8vIERhdGEgY29ubmVjdGlvbiBpw6dpbiBpxZ9sZW1sZXJcbiAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAvLyBEYXRhIHRyYW5zZmVyIGnFn2xlbWxlcmlcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIERhdGEgY29ubmVjdGlvbiBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIGNsb3NlZGApO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERhdGEgYmHEn2xhbnTEsXPEsW7EsSAoUEFTVi9QT1JUKSBrYWJ1bCBldCB2ZSBiZWtsZXllbiBha3RhcsSxbcSxIGJhxJ9sYS5cbiAgICogVmVyaSBha3RhcsSxbcSxIGtvbXV0IChMSVNUL1JFVFIvU1RPUikgZ2VsZGnEn2luZGUgYmHFn2xhcjsgaXN0ZW1jaSB2ZXJpXG4gICAqIGJhxJ9sYW50xLFzxLFuxLEga29tdXR0YW4gw7ZuY2UgYcOndMSxxJ/EsW5kYSBiYcSfbGFudMSxIGJla2xldGlsaXIuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZVBhc3NpdmVEYXRhQ29ubmVjdGlvbihzb2NrZXQ6IG5ldC5Tb2NrZXQsIGNvbm5JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgZGF0YSBjb25uZWN0aW9uIGFjY2VwdGVkOiAke2Nvbm5JZH0gKHJlbW90ZSBwb3J0ICR7c29ja2V0LnJlbW90ZVBvcnR9KWApO1xuICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSA9IGZhbHNlO1xuXG4gICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIERhdGEgY29ubmVjdGlvbiBlcnJvcjogJHtlcnIubWVzc2FnZX0gKHJlbW90ZSBwb3J0ICR7c29ja2V0LnJlbW90ZVBvcnR9KWApO1xuICAgICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPT09IHNvY2tldCkge1xuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSB0cnVlO1xuICAgICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgKGhhZEVycm9yKSA9PiB7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9PT0gc29ja2V0KSB7XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSA9IHRydWU7XG4gICAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQXluxLEgYW5kYSB5YWxuxLF6Y2EgYmlyIGRhdGEgYmHEn2xhbnTEsXPEsSBrdWxsYW7EsWzEsXJcbiAgICBpZiAodGhpcy5wZW5kaW5nRGF0YVNvY2tldCAmJiB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICE9PSBzb2NrZXQgJiYgIXRoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3koKTtcbiAgICB9XG4gICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IHNvY2tldDtcbiAgICAgIExvZ2dlci5kZWJ1ZyhgW0Z0cFNlcnZlcl0gcGVuZGluZ0RhdGFTb2NrZXQgYXNzaWduZWQgKHJlbW90ZSBwb3J0ICR7c29ja2V0LnJlbW90ZVBvcnR9KWApO1xuICAgIHRoaXMudHJ5U2VydmVEYXRhKCk7XG4gIH1cblxuICAvKipcbiAgICogTElTVC9SRVRSL1NUT1IgacOnaW4gdmVyaSBiYcSfbGFudMSxc8SxbsSxIGhhesSxcmxhOlxuICAgKiBwYXNpZiBtb2RkYSBpc3RlbWNpbmluIGJhxJ9sYW5tYXPEsSBiZWtsZW5pciwgYWt0aWYgbW9kZGEgKFBPUlQpIHN1bnVjdSBiYcSfbGFuxLFyLlxuICAgKi9cbiAgcHJpdmF0ZSBlbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIC8vIDE1MCdkZW4gc29ucmEgaXN0ZW1jaWRlIHNvbnN1eiBiZWtsZW1lIG9sbWFzxLFuOiBlbiBmYXogREFUQV9XQUlUX1RJTUVPVVRfTVMgYmVrbGVcbiAgICB0aGlzLmFybURhdGFXYWl0VGltZW91dChjb25uSWQpO1xuICAgIExvZ2dlci5kZWJ1ZyhgW0Z0cFNlcnZlcl0gZW5zdXJlRGF0YUNvbm5lY3Rpb24oJHtjb25uSWR9KTogcGVuZGluZyBzb2NrZXQgJHt0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID8gYGV4aXN0cyAocmVtb3RlIHBvcnQgJHt0aGlzLnBlbmRpbmdEYXRhU29ja2V0LnJlbW90ZVBvcnR9LCBkZXN0cm95ZWQ9JHt0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZH0pYCA6ICdub25lJ31gKTtcbiAgICBpZiAodGhpcy5wZW5kaW5nRGF0YVNvY2tldCAmJiAhdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgIHRoaXMudHJ5U2VydmVEYXRhKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY29ubiA9IHRoaXMuY29ubmVjdGlvbnMuZ2V0KGNvbm5JZCk7XG4gICAgaWYgKCFjb25uIHx8IGNvbm4uZGF0YU1vZGUgIT09ICdhY3RpdmUnIHx8ICFjb25uLmFjdGl2ZURhdGFUYXJnZXQpIHtcbiAgICAgIC8vIFBhc2lmIG1vZDogaXN0ZW1jaW5pbiBiYWdsYW5tYXNpIGJla2xlbmlyXG4gICAgICBpZiAoXG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSAmJlxuICAgICAgICB0aGlzLnBlbmRpbmdTdG9yRmlsZSAhPT0gbnVsbCAmJlxuICAgICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID09PSBjb25uSWRcbiAgICAgICkge1xuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMucGVuZGluZ1N0b3JGaWxlO1xuICAgICAgICB0aGlzLnBlbmRpbmdTdG9yRmlsZSA9IG51bGw7XG4gICAgICAgIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPSBudWxsO1xuICAgICAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcGF0aE1vZCA9IHJlcXVpcmUoJ3BhdGgnKTtcbiAgICAgICAgICBjb25zdCBmc01vZCA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgICAgICAgZnNNb2QubWtkaXJTeW5jKHBhdGhNb2QuZGlybmFtZShmaWxlKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgZnNNb2Qud3JpdGVGaWxlU3luYyhmaWxlLCAnJyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTVE9SIGVhcmx5IGNsb3NlIGZpbGUgZXJyb3I6ICR7KGUgYXMgRXJyb3IpLm1lc3NhZ2V9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCAyMjYsICdTdG9yIGNvbXBsZXRlJyk7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTVE9SIGNvbXBsZXRlZCB2aWEgZWFybHkgY2xvc2U6ICR7ZmlsZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXQgPSBjb25uLmFjdGl2ZURhdGFUYXJnZXQ7XG4gICAgY29uc3Qgc29ja2V0ID0gbmV0LmNyZWF0ZUNvbm5lY3Rpb24odGFyZ2V0LnBvcnQsIHRhcmdldC5pcCwgKCkgPT4ge1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQWN0aXZlIGRhdGEgY29ubmVjdGlvbiBlc3RhYmxpc2hlZDogJHt0YXJnZXQuaXB9OiR7dGFyZ2V0LnBvcnR9YCk7XG4gICAgICB0aGlzLmhhbmRsZVBhc3NpdmVEYXRhQ29ubmVjdGlvbihzb2NrZXQsIGNvbm5JZCk7XG4gICAgfSk7XG4gICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBBY3RpdmUgZGF0YSBjb25uZWN0aW9uIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPT09IHNvY2tldCkge1xuICAgICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQmVrbGV5ZW4gTElTVC9SRVRSL1NUT1IgYWt0YXLEsW3EsW7EsSwgdmVyaSBiYcSfbGFudMSxc8SxIGhhesSxcnNhIGJhxZ9sYXQuXG4gICAqIDIyNiB5YW7EsXTEsW7EsSB2ZXJpIGdlcsOnZWt0ZW4gZ8O2bmRlcmlsZGlrdGVuIC8gYWzEsW5kxLFrdGFuIHNvbnJhIGfDtm5kZXIuXG4gICAqL1xuICBwcml2YXRlIHRyeVNlcnZlRGF0YSgpOiB2b2lkIHtcbiAgICBjb25zdCBzb2NrZXQgPSB0aGlzLnBlbmRpbmdEYXRhU29ja2V0O1xuICAgIGlmICghc29ja2V0IHx8IHNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgIExvZ2dlci5kZWJ1ZyhgW0Z0cFNlcnZlcl0gdHJ5U2VydmVEYXRhIHNraXBwZWQ6IHNvY2tldCAke3NvY2tldCA/IGBkZXN0cm95ZWQgKHJlbW90ZSBwb3J0ICR7c29ja2V0LnJlbW90ZVBvcnR9KWAgOiAnbm9uZSd9LCBwZW5kaW5nIExJU1Q9JHt0aGlzLnBlbmRpbmdMaXN0Q29ubklkICE9PSBudWxsfSBSRVRSPSR7dGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbH0gU1RPUj0ke3RoaXMucGVuZGluZ1N0b3JDb25uSWQgIT09IG51bGx9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gTElTVCAvIE5MU1RcbiAgICBpZiAodGhpcy5wZW5kaW5nTGlzdERhdGEgIT09IG51bGwgJiYgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgZGF0YSA9IHRoaXMucGVuZGluZ0xpc3REYXRhO1xuICAgICAgY29uc3QgY29ubklkID0gdGhpcy5wZW5kaW5nTGlzdENvbm5JZDtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3REYXRhID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG5cbiAgICAgIHRoaXMuY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBMSVNUIGRhdGEgc2VuZGluZzogJHtkYXRhLmxlbmd0aH0gYnl0ZXNgKTtcbiAgICAgIHNvY2tldC5vbmNlKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLkxJU1RfRU5ELCAnRGlyZWN0b3J5IGxpc3RpbmcgY29tcGxldGUnKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0LndyaXRlKGRhdGEsICgpID0+IHNvY2tldC5lbmQoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUkVUUlxuICAgIGlmICh0aGlzLnBlbmRpbmdSZXRyRmlsZSAhPT0gbnVsbCAmJiB0aGlzLnBlbmRpbmdSZXRyQ29ubklkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5wZW5kaW5nUmV0ckZpbGU7XG4gICAgICBjb25zdCBjb25uSWQgPSB0aGlzLnBlbmRpbmdSZXRyQ29ubklkO1xuICAgICAgdGhpcy5wZW5kaW5nUmV0ckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcblxuICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFJFVFIgZmlsZSBzZW5kaW5nOiAke2ZpbGV9YCk7XG4gICAgICBjb25zdCByZWFkU3RyZWFtID0gZnMuY3JlYXRlUmVhZFN0cmVhbShmaWxlKTtcbiAgICAgIHJlYWRTdHJlYW0ub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFJFVFIgcmVhZCBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuRklMRV9OT1RfRk9VTkQsICdDYW5ub3QgcmVhZCBmaWxlJyk7XG4gICAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5vbmNlKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLlJFVFJfT0ssICdSZXRyIGNvbXBsZXRlJyk7XG4gICAgICB9KTtcbiAgICAgIHJlYWRTdHJlYW0ucGlwZShzb2NrZXQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNUT1JcbiAgICBpZiAodGhpcy5wZW5kaW5nU3RvckZpbGUgIT09IG51bGwgJiYgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMucGVuZGluZ1N0b3JGaWxlO1xuICAgICAgY29uc3QgY29ubklkID0gdGhpcy5wZW5kaW5nU3RvckNvbm5JZDtcbiAgICAgIHRoaXMucGVuZGluZ1N0b3JGaWxlID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG5cbiAgICAgIHRoaXMuY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTVE9SIGZpbGUgcmVjZWl2aW5nOiAke2ZpbGV9YCk7XG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGUpO1xuICAgICAgd3JpdGVTdHJlYW0ub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFNUT1Igd3JpdGUgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLklOVEVSTkFMX0VSUiwgJ0Nhbm5vdCB3cml0ZSBmaWxlJyk7XG4gICAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICAgIHdyaXRlU3RyZWFtLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLlNUT1JfT0ssICdTdG9yIGNvbXBsZXRlJyk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5waXBlKHdyaXRlU3RyZWFtKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBIZW7DvHogYmVrbGV5ZW4gYWt0YXLEsW0geW9rOiBiYcSfbGFudMSxIGJpciBzb25yYWtpIGtvbXV0IGnDp2luIGHDp8SxayB0dXR1bHVyXG4gIH1cblxuICAvKipcbiAgICogVmVyaSBiYcSfbGFudMSxc8SxIGJla2xlbWUgemFtYW5sYXnEsWPEsXPEsW7EsSBiYcWfbGF0IChpa2luY2kga2V6IGJhxZ9sYXTEsWxtYXopXG4gICAqL1xuICBwcml2YXRlIGFybURhdGFXYWl0VGltZW91dChjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRhdGFXYWl0VGltZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5kYXRhV2FpdFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLmRhdGFXYWl0VGltZXIgPSBudWxsO1xuICAgICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgJiYgIXRoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICAgIHJldHVybjsgLy8gdmVyaSBiYcSfbGFudMSxc8SxIGhhesSxciwgc29ydW4geW9rXG4gICAgICB9XG4gICAgICBjb25zdCBwZW5kaW5nID1cbiAgICAgICAgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCAhPT0gbnVsbCB8fCB0aGlzLnBlbmRpbmdSZXRyQ29ubklkICE9PSBudWxsIHx8IHRoaXMucGVuZGluZ1N0b3JDb25uSWQgIT09IG51bGw7XG4gICAgICBpZiAoIXBlbmRpbmcgfHwgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCAhPT0gY29ubklkICYmIHRoaXMucGVuZGluZ1JldHJDb25uSWQgIT09IGNvbm5JZCAmJiB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBjb25uSWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgTG9nZ2VyLndhcm4oYFtGdHBTZXJ2ZXJdIERhdGEgY29ubmVjdGlvbiB0aW1lb3V0OiAke2Nvbm5JZH0gKG5vIGNvbm5lY3Rpb24gYWZ0ZXIgMTUwKWApO1xuICAgICAgdGhpcy5jbGVhclBlbmRpbmdUcmFuc2ZlcnMoY29ubklkKTtcbiAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLlRSQU5TRkVSX0FCT1JURUQsICdUcmFuc2ZlciBhYm9ydGVkOiBkYXRhIGNvbm5lY3Rpb24gdGltZW91dCcpO1xuICAgIH0sIEZ0cFNlcnZlci5EQVRBX1dBSVRfVElNRU9VVF9NUyk7XG4gIH1cblxuICAvKipcbiAgICogVmVyaSBiYcSfbGFudMSxc8SxIGJla2xlbWUgemFtYW5sYXnEsWPEsXPEsW7EsSBpcHRhbCBldFxuICAgKi9cbiAgcHJpdmF0ZSBjbGVhckRhdGFXYWl0VGltZW91dCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kYXRhV2FpdFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5kYXRhV2FpdFRpbWVyKTtcbiAgICAgIHRoaXMuZGF0YVdhaXRUaW1lciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEJhxJ9sYW50xLFuxLFuIGJla2xleWVuIGFrdGFyxLFtxLFuxLEgdGVtaXpsZSAoeWVuaSBQQVNWIGdlbGluY2UgZXNraXNpIGdlw6dlcnNpeiBvbHVyKVxuICAgKi9cbiAgcHJpdmF0ZSBjbGVhclBlbmRpbmdUcmFuc2ZlcnMoY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgaWYgKHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wZW5kaW5nTGlzdERhdGEgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCA9IG51bGw7XG4gICAgfVxuICAgIGlmICh0aGlzLnBlbmRpbmdSZXRyQ29ubklkID09PSBjb25uSWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJGaWxlID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJDb25uSWQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9PT0gY29ubklkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdTdG9yRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgeWFuxLF0IGfDtm5kZXJcbiAgICovXG4gIHByaXZhdGUgd3JpdGVDb250cm9sKGNvbm5JZDogc3RyaW5nLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgIGlmIChjb25uICYmIGNvbm4uc29ja2V0KSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IGNvZGU7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgIGNvbm4uc29ja2V0LndyaXRlKGAke2NvZGV9ICR7bWVzc2FnZX1gICsgJ1xcclxcbicpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogQmHEn2xhbnTEsXnEsSBrYXBhdFxuICAgKi9cbiAgcHVibGljIGNsb3NlQ29ubmVjdGlvbihjb25uSWQ6IHN0cmluZywgcmVhc29uPzogc3RyaW5nKTogdm9pZCB7XG4gICAgLy8gQmHEn2xhbnTEsXlhIGFpdCB0YW1wb24sIGt1eXJ1ayB2ZSBiZWtsZXllbiBha3RhcsSxbSBrYXnEsXRsYXLEsW7EsSB0ZW1pemxlXG4gICAgdGhpcy5pbnB1dEJ1ZmZlcnMuZGVsZXRlKGNvbm5JZCk7XG4gICAgdGhpcy5jb21tYW5kUXVldWVzLmRlbGV0ZShjb25uSWQpO1xuICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG4gICAgaWYgKHRoaXMucGFzc2l2ZUNvbm5JZCA9PT0gY29ubklkKSB7XG4gICAgICB0aGlzLnBhc3NpdmVDb25uSWQgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgIGlmIChjb25uKSB7XG4gICAgICBjb25uLnNvY2tldD8uZW5kKCk7XG4gICAgICB0aGlzLmNvbm5lY3Rpb25zLmRlbGV0ZShjb25uSWQpO1xuICAgICAgdGhpcy5jb25uZWN0aW9uQ291bnQtLTtcbiAgICAgIGlmIChyZWFzb24pIHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIGNsb3NlZDogJHtjb25uSWR9IChyZWFzb246ICR7cmVhc29ufSlgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBjbG9zZWQ6ICR7Y29ubklkfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19