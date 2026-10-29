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
        this.dataConnectionClosedEarly = false;
        this.inputBuffers = new Map();
        this.commandQueues = new Map();
        this.pendingDataSocket = null;
        this.passiveConnId = null;
        this.dataWaitTimer = null;
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
                logger_1.Logger.info(`[FtpServer] FTP server started: http://localhost:${this.config.port}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnRwU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvRnRwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLEdBQUcsZ0NBQVk7QUFDM0IsTUFBWSxJQUFJLGlDQUFhO0FBQzdCLG9DQUFpRjtBQUNqRixnREFBNkM7QUFFN0MsNENBQW1EO0FBQ25ELE1BQVksUUFBUSx3Q0FBb0I7QUFLeEMsTUFBTSxjQUFjLEdBQWlCO0lBQ25DLElBQUksRUFBRSxFQUFFO0lBQ1IsUUFBUSxFQUFFLEVBQUU7SUFDWixRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDO0lBQy9DLGNBQWMsRUFBRSxHQUFHO0lBQ25CLFFBQVEsRUFBRSxNQUFNO0lBRWhCLE1BQU0sRUFBRSxFQUFFO0lBRVYsZ0JBQWdCLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7Q0FDN0MsQ0FBQztBQUtGO0lBb0NFLFlBQVksTUFBTSxHQUFtQyxFQUFFO1FBbkMvQyxXQUFNLEdBQXNCLElBQUksQ0FBQztRQUNqQyxlQUFVLEdBQXNCLElBQUksQ0FBQztRQUNyQyxnQkFBVyxHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3BELG9CQUFlLEdBQXFCLElBQUksR0FBRyxFQUFFLENBQUM7UUFFOUMsZ0JBQVcsR0FBdUIsSUFBSSxDQUFDO1FBQ3ZDLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO1FBRTVCLGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBQzdCLGNBQVMsR0FBVyxXQUFXLENBQUM7UUFDaEMsc0JBQWlCLEdBQXNCLElBQUksQ0FBQztRQUM1QyxvQkFBZSxHQUFXLEtBQUssQ0FBQztRQUVoQyxzQkFBaUIsR0FBVyxDQUFDLENBQUM7UUFDOUIsb0JBQWUs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RyxDQUFDLENBQUM7WUFDNUUsQ0FBQztpQkFBTSxDQUFDO2dCQUNSLGVBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDeEQsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0NBQ0Y7O0FBcGxCeUIsOEJBQW9CLEdBQUcsS0FBSyxBQUFSLENBQVMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBSZXBseUNvZGUsIEZ0cENvbm5lY3Rpb24sIENvbW1hbmRSZXN1bHQsIFNlcnZlckNvbmZpZyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgbm9ybWFsaXplRGlyUGF0aCwgZW5zdXJlRGlyZWN0b3J5RXhpc3RzIH0gZnJvbSAnLi4vdXRpbHMvcGF0aFV0aWxzJztcbmltcG9ydCB7IExvZ2dlciwgTG9nTGV2ZWwgfSBmcm9tICcuLi91dGlscy9sb2dnZXInO1xuaW1wb3J0ICogYXMgQ29tbWFuZHMgZnJvbSAnLi4vY29tbWFuZHMnO1xuXG4vKipcbiAqIERlZmF1bHQgYXlhcmxhclxuICovXG5jb25zdCBERUZBVUxUX0NPTkZJRzogU2VydmVyQ29uZmlnID0ge1xuICBwb3J0OiAyMSxcbiAgZGF0YVBvcnQ6IDIwLFxuICB1c2VyRmlsZTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL3VzZXJzLmpzb24nKSxcbiAgbWF4Q29ubmVjdGlvbnM6IDEwMCxcbiAgbG9nTGV2ZWw6ICdpbmZvJyxcbiAgLy8gMjIwIGthcsWfxLFsYW1hIG1lc2FqxLE7IGJvxZ8gYsSxcmFrxLFsxLFyc2EgXCI8cG9ydD4gRlRQIFNlcnZlciBSZWFkeVwiIMO8cmV0aWxpclxuICBiYW5uZXI6ICcnLFxuICAvLyBQQVNWIHZlcmkgYmHEn2xhbnTEsSBwb3J0bGFyxLEgYnUgYXJhbMSxa3RhbiBzZcOnaWxpclxuICBwYXNzaXZlUG9ydFJhbmdlOiB7IG1pbjogNTAwMDAsIG1heDogNTAwNTAgfSxcbn07XG5cbi8qKlxuICogRlRQIFN1bnVjdXN1IGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBGdHBTZXJ2ZXIge1xuICBwcml2YXRlIHNlcnZlcjogbmV0LlNlcnZlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRhdGFTZXJ2ZXI6IG5ldC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uczogTWFwPHN0cmluZywgRnRwQ29ubmVjdGlvbj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZGF0YUNvbm5lY3Rpb25zOiBNYXA8c3RyaW5nLCBhbnk+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGNvbmZpZzogdHlwZW9mIERFRkFVTFRfQ09ORklHO1xuICBwcml2YXRlIHVzZXJNYW5hZ2VyOiBVc2VyTWFuYWdlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNvbm5lY3Rpb25Db3VudDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBtYXhDb25uZWN0aW9uczogbnVtYmVyO1xuICBwcml2YXRlIHBhc3NpdmVNb2RlOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgcGFzc2l2ZUlwOiBzdHJpbmcgPSAnMTI3LjAuMC4xJztcbiAgcHJpdmF0ZSBwYXNzaXZlRGF0YVNlcnZlcjogbmV0LlNlcnZlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBhc3NpdmVEYXRhUG9ydDogbnVtYmVyID0gNTAwMDA7XG4gIC8qKiBQQVNWIHBvcnQgYXJhbMSxxJ/EsSDDvHplcmluZGUgZG9sYcWfYW4gaW1sZcOnICovXG4gIHByaXZhdGUgcGFzc2l2ZVBvcnRDdXJzb3I6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgcGVuZGluZ0xpc3REYXRhOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nTGlzdENvbm5JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1JldHJGaWxlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nUmV0ckNvbm5JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGVuZGluZ1N0b3JGaWxlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nU3RvckNvbm5JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIC8qKiBQYXNpZiB2ZXJpIGJhZ2xhbnRpc2kgYWt0YXJpbSBhdGFubWFkYW4gb25jZSBrYXBhbmRpIChlcmtlbiBrYXBhbm1hKSAqL1xuICBwcml2YXRlIGRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHk6IGJvb2xlYW4gPSBmYWxzZTtcbiAgLyoqIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW5hIGdlbGVuIHlhcsSxbSAodGFtYW1sYW5tYW3EscWfKSBrb211dCBzYXTEsXJsYXLEsSAqL1xuICBwcml2YXRlIGlucHV0QnVmZmVyczogTWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoKTtcbiAgLyoqIEJhxJ9sYW50xLEgYmHFn8SxbmEga29tdXRsYXLEsW4gc8SxcmF5bGEgacWfbGVubWVzaSBpw6dpbiBrdXlydWsgKi9cbiAgcHJpdmF0ZSBjb21tYW5kUXVldWVzOiBNYXA8c3RyaW5nLCBQcm9taXNlPHZvaWQ+PiA9IG5ldyBNYXAoKTtcbiAgLyoqIEhlbsO8eiBrdWxsYW7EsWxtYW3EscWfIHBhc2lmL2FrdGlmIGRhdGEgYmHEn2xhbnTEsXPEsSAqL1xuICBwcml2YXRlIHBlbmRpbmdEYXRhU29ja2V0OiBuZXQuU29ja2V0IHwgbnVsbCA9IG51bGw7XG4gIC8qKiBTb24gUEFTViBrb211dHVudSB2ZXJlbiBiYcSfbGFudMSxIChkYXRhIGJhxJ9sYW50xLFzxLEgc2FoaWJpKSAqL1xuICBwcml2YXRlIHBhc3NpdmVDb25uSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAvKiogMTUwIGfDtm5kZXJpbGRpa3RlbiBzb25yYSB2ZXJpIGJhxJ9sYW50xLFzxLEgZ2VsbWV6c2UgYXPEsWzEsSBrYWxtYW1hayBpw6dpbiB6YW1hbmxhecSxY8SxICovXG4gIHByaXZhdGUgZGF0YVdhaXRUaW1lcjogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcbiAgLyoqIFZlcmkgYmHEn2xhbnTEsXPEsSBpw6dpbiBhemFtaSBiZWtsZW1lIHPDvHJlc2kgKG1zKSAqL1xuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBEQVRBX1dBSVRfVElNRU9VVF9NUyA9IDE1MDAwO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogUGFydGlhbDx0eXBlb2YgREVGQVVMVF9DT05GSUc+ID0ge30pIHtcbiAgICB0aGlzLmNvbmZpZyA9IHsgLi4uREVGQVVMVF9DT05GSUcsIC4uLmNvbmZpZyB9IGFzIFNlcnZlckNvbmZpZztcbiAgICB0aGlzLm1heENvbm5lY3Rpb25zID0gdGhpcy5jb25maWcubWF4Q29ubmVjdGlvbnMgfHwgREVGQVVMVF9DT05GSUcubWF4Q29ubmVjdGlvbnM7XG5cbiAgICAvLyBCYW5uZXI6IGJvxZ8gYsSxcmFrxLFsxLFyc2EgXCI8cG9ydD4gRlRQIFNlcnZlciBSZWFkeVwiXG4gICAgY29uc3QgYmFubmVyID0gdHlwZW9mIHRoaXMuY29uZmlnLmJhbm5lciA9PT0gJ3N0cmluZycgPyB0aGlzLmNvbmZpZy5iYW5uZXIudHJpbSgpIDogJyc7XG4gICAgdGhpcy5jb25maWcuYmFubmVyID0gYmFubmVyICE9PSAnJyA/IGJhbm5lciA6IGAke3RoaXMuY29uZmlnLnBvcnR9IEZUUCBTZXJ2ZXIgUmVhZHlgO1xuXG4gICAgLy8gUEFTViBwb3J0IGFyYWzEscSfxLFuxLEgZG/En3J1bGFcbiAgICB0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlID0gdGhpcy5ub3JtYWxpemVQb3J0UmFuZ2UodGhpcy5jb25maWcucGFzc2l2ZVBvcnRSYW5nZSk7XG4gICAgLy8gTG9nZ2VyIHNldml5ZXNpbmkgYXlhcmxhXG4gICAgbGV0IGxvZ0xldmVsRW51bTogTG9nTGV2ZWwgPSBMb2dMZXZlbC5JTkZPO1xuICAgIGlmICh0aGlzLmNvbmZpZy5sb2dMZXZlbCA9PT0gJ2RlYnVnJykge1xuICAgICAgbG9nTGV2ZWxFbnVtID0gTG9nTGV2ZWwuREVCVUc7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5sb2dMZXZlbCA9PT0gJ3dhcm4nKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5XQVJOO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcubG9nTGV2ZWwgPT09ICdlcnJvcicpIHtcbiAgICAgIGxvZ0xldmVsRW51bSA9IExvZ0xldmVsLkVSUk9SO1xuICAgIH1cbiAgICBMb2dnZXIuc2V0TGV2ZWwobG9nTGV2ZWxFbnVtKTtcbiAgICAvLyBVc2VyTWFuYWdlcifEsSBiYcWfbGF0XG4gICAgdGhpcy51c2VyTWFuYWdlciA9IG5ldyBVc2VyTWFuYWdlcih0aGlzLmNvbmZpZy51c2VyRmlsZSk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEZUUCBzZXJ2ZXIgc3RhcnRpbmcuLi5gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29udHJvbCBwb3J0OiAke3RoaXMuY29uZmlnLnBvcnR9YCk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIERhdGEgcG9ydDogJHt0aGlzLmNvbmZpZy5kYXRhUG9ydH1gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTWF4IGNvbm5lY3Rpb25zOiAke3RoaXMubWF4Q29ubmVjdGlvbnN9YCk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEJhbm5lcjogJHt0aGlzLmNvbmZpZy5iYW5uZXJ9YCk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBBU1YgcG9ydCByYW5nZTogJHt0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlLm1pbn0tJHt0aGlzLmNvbmZpZy5wYXNzaXZlUG9ydFJhbmdlLm1heH1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYTsgZ2XDp2Vyc2l6c2UgdmFyc2F5xLFsYW4gYXJhbMSxxJ9hIGTDtm5cbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplUG9ydFJhbmdlKHJhbmdlOiB7IG1pbj86IG51bWJlcjsgbWF4PzogbnVtYmVyIH0gfCB1bmRlZmluZWQpOiB7IG1pbjogbnVtYmVyOyBtYXg6IG51bWJlciB9IHtcbiAgICBjb25zdCBmYWxsYmFjayA9IHsgLi4uREVGQVVMVF9DT05GSUcucGFzc2l2ZVBvcnRSYW5nZSB9O1xuICAgIGlmICghcmFuZ2UpIHtcbiAgICAgIHJldHVybiBmYWxsYmFjaztcbiAgICB9XG4gICAgY29uc3QgbWluID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWluKSk7XG4gICAgY29uc3QgbWF4ID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWF4KSk7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobWluKSB8fCAhTnVtYmVyLmlzRmluaXRlKG1heCkgfHwgbWluIDwgMSB8fCBtYXggPiA2NTUzNSB8fCBtaW4gPiBtYXgpIHtcbiAgICAgIExvZ2dlci53YXJuKGBbRnRwU2VydmVyXSBJbnZhbGlkIFBBU1YgcG9ydCByYW5nZTogJHtyYW5nZS5taW59LSR7cmFuZ2UubWF4fSwgdXNpbmcgZGVmYXVsdCAke2ZhbGxiYWNrLm1pbn0tJHtmYWxsYmFjay5tYXh9YCk7XG4gICAgICByZXR1cm4gZmFsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiB7IG1pbiwgbWF4IH07XG4gIH1cblxuICAvKipcbiAgICogWWFwxLFsYW5kxLFyxLFsYW4gUEFTViBwb3J0IGFyYWzEscSfxLFuZGFuIHPEsXJheWxhICh5dXZhcmxhayB1c3VsKSBiaXIgcG9ydCBzZcOnXG4gICAqL1xuICBwcml2YXRlIG5leHRQYXNzaXZlUG9ydCgpOiBudW1iZXIge1xuICAgIGNvbnN0IHsgbWluLCBtYXggfSA9IHRoaXMuY29uZmlnLnBhc3NpdmVQb3J0UmFuZ2U7XG4gICAgY29uc3Qgc3BhbiA9IG1heCAtIG1pbiArIDE7XG4gICAgY29uc3QgcG9ydCA9IG1pbiArICh0aGlzLnBhc3NpdmVQb3J0Q3Vyc29yICUgc3Bhbik7XG4gICAgdGhpcy5wYXNzaXZlUG9ydEN1cnNvciA9ICh0aGlzLnBhc3NpdmVQb3J0Q3Vyc29yICsgMSkgJSBzcGFuO1xuICAgIHJldHVybiBwb3J0O1xuICB9XG5cbiAgLyoqXG4gICAqIFBBU1YgcG9ydHVudSBkaW5sZW1leWUgYWwgKGRpbmxleWljaSB6YXRlbiBvIHBvcnR0YXlzYSB5ZW5pZGVuIGt1cnVsbWF6KS5cbiAgICogMjI3IHlhbsSxdMSxIGFuY2FrIHBvcnQgZ2Vyw6dla3RlbiBkaW5sZWRpa3RlbiBzb25yYSBnw7ZuZGVyaWxpci5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlUGFzc2l2ZUxpc3RlbmVyKHBvcnQ6IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLnBhc3NpdmVEYXRhU2VydmVyICYmIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIubGlzdGVuaW5nICYmIHRoaXMucGFzc2l2ZURhdGFQb3J0ID09PSBwb3J0KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBFc2tpIGRpbmxleWljaXlpIGthcGF0IChrYWJ1bCBlZGlsbWnFnyB2ZXJpIGJhxJ9sYW50xLFsYXLEsSBldGtpbGVubWV6KVxuICAgIGlmICh0aGlzLnBhc3NpdmVEYXRhU2VydmVyKSB7XG4gICAgICBjb25zdCBvbGRTZXJ2ZXIgPSB0aGlzLnBhc3NpdmVEYXRhU2VydmVyO1xuICAgICAgdGhpcy5wYXNzaXZlRGF0YVNlcnZlciA9IG51bGw7XG4gICAgICBvbGRTZXJ2ZXIuY2xvc2UoKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXIgPSBuZXQuY3JlYXRlU2VydmVyKChkYXRhU29ja2V0KSA9PiB7XG4gICAgICBjb25zdCBvd25lcklkID0gdGhpcy5wYXNzaXZlQ29ubklkIHx8ICcnO1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgZGF0YSBjb25uZWN0aW9uIGVzdGFibGlzaGVkOiBwb3J0ICR7cG9ydH0gKCR7b3duZXJJZH0pYCk7XG4gICAgICB0aGlzLmhhbmRsZVBhc3NpdmVEYXRhQ29ubmVjdGlvbihkYXRhU29ja2V0LCBvd25lcklkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgICAgc2VydmVyLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgcG9ydCAke3BvcnR9IGNhbm5vdCBvcGVuOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiB7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIgPSBzZXJ2ZXI7XG4gICAgICAgIHRoaXMucGFzc2l2ZURhdGFQb3J0ID0gcG9ydDtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgZGF0YSBzZXJ2ZXIgc3RhcnRlZDogcG9ydCAke3BvcnR9YCk7XG4gICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGVFAgc3VudWN1c3VudSBiYcWfbGF0XG4gICAqL1xuICBwdWJsaWMgc3RhcnQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoc29ja2V0KSA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlQ29ubmVjdGlvbihzb2NrZXQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc2VydmVyLmxpc3Rlbih0aGlzLmNvbmZpZy5wb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBGVFAgc2VydmVyIHN0YXJ0ZWQ6IGh0dHA6Ly9sb2NhbGhvc3Q6JHt0aGlzLmNvbmZpZy5wb3J0fWApO1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gVXNlciBkYXRhOiAke3RoaXMuY29uZmlnLnVzZXJGaWxlfWApO1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29tbWFuZHM6IFVTRVIsIFBBU1MsIENXRCwgUFdELCBMSVNULCBSRVRSLCBTVE9SLCBERUxFLCBRVUlULCBOT09QYCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zZXJ2ZXIub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcnZlci5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBGVFAgc2VydmVyIGNsb3NlZGApO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIERhdGEgc2VydmVyIGJhxZ9sYXRcbiAgICAgIHRoaXMuZGF0YVNlcnZlciA9IG5ldC5jcmVhdGVTZXJ2ZXIoKGRhdGFTb2NrZXQpID0+IHtcbiAgICAgICAgdGhpcy5oYW5kbGVEYXRhQ29ubmVjdGlvbihkYXRhU29ja2V0KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmRhdGFTZXJ2ZXIubGlzdGVuKHRoaXMuY29uZmlnLmRhdGFQb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIHNlcnZlciBzdGFydGVkOiBwb3J0ICR7dGhpcy5jb25maWcuZGF0YVBvcnR9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5kYXRhU2VydmVyLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ1tGdHBTZXJ2ZXJdIFN0YXJ0dXAgZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBZZW5pIGJhxJ9sYW50xLF5xLEgacWfbGVcbiAgICovXG4gIHByaXZhdGUgaGFuZGxlQ29ubmVjdGlvbihzb2NrZXQ6IG5ldC5Tb2NrZXQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25uSWQgPSBgY29ubl8ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIE5ldyBjb25uZWN0aW9uOiAke2Nvbm5JZH0gKElQOiAke3NvY2tldC5yZW1vdGVBZGRyZXNzfSlgKTtcblxuICAgIC8vIE1ha3NpbXVtIGJhxJ9sYW50xLEga29udHJvbMO8XG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbkNvdW50ID49IHRoaXMubWF4Q29ubmVjdGlvbnMpIHtcbiAgICAgIHNvY2tldD8ud3JpdGUoYDUwMyBTZXJ2aWNlIG5vdCBhdmFpbGFibGVcXHJcXG5gKTtcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbm5lY3Rpb25Db3VudCsrO1xuXG4gICAgY29uc3QgY29ubmVjdGlvbjogRnRwQ29ubmVjdGlvbiA9IHtcbiAgICAgIHNvY2tldCxcbiAgICAgIHVzZXI6IG51bGwsXG4gICAgICBwYXNzOiBudWxsLFxuICAgICAgaG9tZURpcjogJycsXG4gICAgICBjdXJyZW50RGlyOiAnJyxcbiAgICAgIHBlcm1pc3Npb25zOiB7fSxcbiAgICAgIHRyYW5zZmVyTW9kZTogbnVsbCxcbiAgICAgIHRyYW5zZmVyU2l6ZTogMCxcbiAgICAgIGxhc3RSZXBseTogMCxcbiAgICAgIGxhc3RNZXNzYWdlOiAnJyxcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0aW9ucy5zZXQoY29ubklkLCBjb25uZWN0aW9uKTtcblxuICAgIC8vIEJhxJ9sYW50xLEgYmHFn2xhdG1hIG1lc2FqxLFcbiAgICBzb2NrZXQ/LndyaXRlKGAyMjAgJHt0aGlzLmNvbmZpZy5iYW5uZXJ9XFxyXFxuYCk7XG5cbiAgICAvLyBCYcSfbGFudMSxIG9sYXlsYXLEsVxuICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgIHRoaXMuaGFuZGxlQ29udHJvbERhdGEoY29ubklkLCBkYXRhKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gZXJyb3IgKCR7Y29ubklkfSk6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQsICdlcnJvcicpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIGNsb3NlZDogJHtjb25uSWR9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gdGltZW91dDogJHtjb25uSWR9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQsICd0aW1lb3V0Jyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgZ2VsZW4gdmVyaXlpIHNhdMSxciBzYXTEsXIgYXlyxLHFn3TEsXIuXG4gICAqIFRlayBwYWtldHRlIGJpcmRlbiDDp29rIGtvbXV0IGdlbGViaWxpciwgeWFyxLFtIGthbGFuIHNhdMSxciBzb25yYWtpIHBha2V0dGUgdGFtYW1sYW7EsXIuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZUNvbnRyb2xEYXRhKGNvbm5JZDogc3RyaW5nLCBkYXRhOiBCdWZmZXIpOiB2b2lkIHtcbiAgICBjb25zdCBidWZmZXIgPSAodGhpcy5pbnB1dEJ1ZmZlcnMuZ2V0KGNvbm5JZCkgfHwgJycpICsgZGF0YS50b1N0cmluZygndXRmLTgnKTtcbiAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgvXFxyXFxufFxcbnxcXHIvKTtcbiAgICAvLyBTb24gcGFyw6dhIHlhcsSxbSBzYXTEsXIgb2xhYmlsaXI6IGJpciBzb25yYWtpIHBha2V0ZSBrYWRhciBzYWtsYVxuICAgIHRoaXMuaW5wdXRCdWZmZXJzLnNldChjb25uSWQsIGxpbmVzLnBvcCgpID8/ICcnKTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgdGhpcy5lbnF1ZXVlQ29tbWFuZChjb25uSWQsIGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBLb211dGxhcsSxIGJhxJ9sYW50xLEgYmHFn8SxbmEgc8SxcmF5bGEgacWfbGUgKGFzeW5jIGtvbXV0bGFyIHPEsXJhecSxIGJvem1hc8SxbilcbiAgICovXG4gIHByaXZhdGUgZW5xdWV1ZUNvbW1hbmQoY29ubklkOiBzdHJpbmcsIGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy5jb21tYW5kUXVldWVzLmdldChjb25uSWQpIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGNvbnN0IG5leHQgPSBwcmV2aW91c1xuICAgICAgLnRoZW4oKCkgPT4gdGhpcy5wcm9jZXNzQ29tbWFuZChjb25uSWQsIGxpbmUpKVxuICAgICAgLmNhdGNoKChlcnIpID0+IExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQ29tbWFuZCBwcm9jZXNzaW5nIGZhaWxlZCAoJHtjb25uSWR9KTpgLCBlcnIpKTtcbiAgICB0aGlzLmNvbW1hbmRRdWV1ZXMuc2V0KGNvbm5JZCwgbmV4dCk7XG4gIH1cblxuICAvKipcbiAgICogVGVrIGJpciBrb211dCBzYXTEsXLEsW7EsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwcm9jZXNzQ29tbWFuZChjb25uSWQ6IHN0cmluZywgcmF3TGluZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgICAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICAgICAgaWYgKCFjb25uKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBub3QgZm91bmQ6ICR7Y29ubklkfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxpbmUgPSByYXdMaW5lLnRyaW0oKTtcbiAgICAgIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEtvbXV0dSBpbGsgYm/Fn2x1a3RhbiBiw7ZsOiBkb3N5YS8gZGl6aW4gYWRsYXLEsW5kYWtpIGJvxZ9sdWtsYXIga29ydW51clxuICAgICAgY29uc3Qgc2VwYXJhdG9ySW5kZXggPSBsaW5lLnNlYXJjaCgvXFxzLyk7XG4gICAgICBjb25zdCBjb21tYW5kID0gKHNlcGFyYXRvckluZGV4ID09PSAtMSA/IGxpbmUgOiBsaW5lLnNsaWNlKDAsIHNlcGFyYXRvckluZGV4KSkudG9VcHBlckNhc2UoKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBzZXBhcmF0b3JJbmRleCA9PT0gLTEgPyAnJyA6IGxpbmUuc2xpY2Uoc2VwYXJhdG9ySW5kZXgpLnRyaW0oKTtcblxuICAgICAgaWYgKGNvbW1hbmQgPT09ICdVU0VSJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVVc2VyKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUEFTUycpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUGFzcyhjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1FVSVQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVF1aXQoY29ubklkLCBjb25uLCAoaWQsIHJlYXNvbikgPT4gdGhpcy5jbG9zZUNvbm5lY3Rpb24oaWQsIHJlYXNvbikpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnTk9PUCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlTm9vcChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUFdEJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQd2QoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0NXRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlQ3dkKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnTElTVCcgfHwgY29tbWFuZCA9PT0gJ05MU1QnKSB7XG4gICAgICAgIGNvbnN0IGxpc3RSZXN1bHQgPSBhd2FpdCBDb21tYW5kcy5oYW5kbGVMaXN0KGNvbm5JZCwgY29ubiwgdGhpcy51c2VyTWFuYWdlciEsIHNvY2tldCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdE9iaiA9IGxpc3RSZXN1bHQgYXMgYW55O1xuICAgICAgICBpZiAocmVzdWx0T2JqICYmIHJlc3VsdE9iai5kYXRhICYmIHR5cGVvZiByZXN1bHRPYmouZGF0YSA9PT0gJ29iamVjdCcgJiYgcmVzdWx0T2JqLmRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBsaXN0RGF0YSA9IHJlc3VsdE9iai5kYXRhIGFzIHsgb3V0cHV0OiBzdHJpbmcsIGRpcmVjdG9yeTogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nTGlzdERhdGEgPSBsaXN0RGF0YS5vdXRwdXQ7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCA9IGNvbm5JZDtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTElTVCBkYXRhIHdhaXRpbmc6ICR7bGlzdERhdGEub3V0cHV0ID8gbGlzdERhdGEub3V0cHV0Lmxlbmd0aCA6IDB9IGJ5dGVzYCk7XG4gICAgICAgICAgdGhpcy5lbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdSRVRSJykge1xuICAgICAgICBjb25zdCByZXRyUmVzdWx0ID0gYXdhaXQgQ29tbWFuZHMuaGFuZGxlUmV0cihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhLCBzb2NrZXQpO1xuICAgICAgICBjb25zdCByZXN1bHRPYmogPSByZXRyUmVzdWx0IGFzIGFueTtcbiAgICAgICAgaWYgKHJlc3VsdE9iaiAmJiByZXN1bHRPYmouZGF0YSAmJiB0eXBlb2YgcmVzdWx0T2JqLmRhdGEgPT09ICdvYmplY3QnICYmIHJlc3VsdE9iai5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgcmV0ckRhdGEgPSByZXN1bHRPYmouZGF0YSBhcyB7IGZpbGVQYXRoOiBzdHJpbmcgfTtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IHJldHJEYXRhLmZpbGVQYXRoO1xuICAgICAgICAgIHRoaXMucGVuZGluZ1JldHJDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFJFVFIgZmlsZSB3YWl0aW5nOiAke3JldHJEYXRhLmZpbGVQYXRofWApO1xuICAgICAgICAgIHRoaXMuZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnU1RPUicpIHtcbiAgICAgICAgY29uc3Qgc3RvclJlc3VsdCA9IGF3YWl0IENvbW1hbmRzLmhhbmRsZVN0b3IoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISwgc29ja2V0KTtcbiAgICAgICAgY29uc3QgcmVzdWx0T2JqID0gc3RvclJlc3VsdCBhcyBhbnk7XG4gICAgICAgIGlmIChyZXN1bHRPYmogJiYgcmVzdWx0T2JqLmRhdGEgJiYgdHlwZW9mIHJlc3VsdE9iai5kYXRhID09PSAnb2JqZWN0JyAmJiByZXN1bHRPYmouZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHN0b3JEYXRhID0gcmVzdWx0T2JqLmRhdGEgYXMgeyBmaWxlUGF0aDogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBzdG9yRGF0YS5maWxlUGF0aDtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gY29ubklkO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTVE9SIGZpbGUgd2FpdGluZzogJHtzdG9yRGF0YS5maWxlUGF0aH1gKTtcbiAgICAgICAgICB0aGlzLmVuc3VyZURhdGFDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0RFTEUnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZURlbGUoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQQVNWJykge1xuICAgICAgICAvLyBQYXNpZiBtb2Q6IGRhdGEgYmHEn2xhbnTEsXPEsW7EsW4gc2FoaWJpIGJ1IGtvbXV0dSB2ZXJlbiBiYcSfbGFudMSxZMSxclxuICAgICAgICB0aGlzLnBhc3NpdmVDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFlhcMSxbGFuZMSxcsSxbGFuIGFyYWzEsWt0YW4gcG9ydCBzZcOnIHZlIGRpbmxlbWV5ZSBhbFxuICAgICAgICBjb25zdCBwb3J0ID0gdGhpcy5uZXh0UGFzc2l2ZVBvcnQoKTtcbiAgICAgICAgY29uc3QgbGlzdGVuaW5nID0gYXdhaXQgdGhpcy5lbnN1cmVQYXNzaXZlTGlzdGVuZXIocG9ydCk7XG4gICAgICAgIGlmIChsaXN0ZW5pbmcpIHtcbiAgICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQYXN2KGNvbm5JZCwgY29ubiwgdGhpcy5wYXNzaXZlSXAsIHBvcnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNvY2tldD8ud3JpdGUoYDQyNSBDYW5ub3Qgb3BlbiBkYXRhIGNvbm5lY3Rpb25cXHJcXG5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUE9SVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUG9ydChjb25uLCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0ZFQVQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZUZlYXQoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1NZU1QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVN5c3QoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1RZUEUnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVR5cGUoY29ubiwgYXJncyk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdNS0QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZU1rZChjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JNRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm1kKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUk5GUicpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm5mcihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JOVE8nKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVJudG8oY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCaWxpbm1leWVuIGtvbXV0XG4gICAgICAgIHNvY2tldD8ud3JpdGUoYDUwMiBDb21tYW5kIG5vdCBpbXBsZW1lbnRlZDogJHtjb21tYW5kfVxcclxcbmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIERhdGEgcHJvY2Vzc2luZyBlcnJvciAoJHtjb25uSWR9KTpgLCBlcnJvcik7XG4gICAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICAgIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcXHJcXG5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVmVyaSBiYcSfbGFudMSxc8SxbsSxIGnFn2xlXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZURhdGFDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCk6IHZvaWQge1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWRgKTtcbiAgICAvLyBEYXRhIGNvbm5lY3Rpb24gacOnaW4gacWfbGVtbGVyXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgLy8gRGF0YSB0cmFuc2ZlciBpxZ9sZW1sZXJpXG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIERhdGEgY29ubmVjdGlvbiBjbG9zZWRgKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEYXRhIGJhxJ9sYW50xLFzxLFuxLEgKFBBU1YvUE9SVCkga2FidWwgZXQgdmUgYmVrbGV5ZW4gYWt0YXLEsW3EsSBiYcSfbGEuXG4gICAqIFZlcmkgYWt0YXLEsW3EsSBrb211dCAoTElTVC9SRVRSL1NUT1IpIGdlbGRpxJ9pbmRlIGJhxZ9sYXI7IGlzdGVtY2kgdmVyaVxuICAgKiBiYcSfbGFudMSxc8SxbsSxIGtvbXV0dGFuIMO2bmNlIGHDp3TEscSfxLFuZGEgYmHEn2xhbnTEsSBiZWtsZXRpbGlyLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oc29ja2V0OiBuZXQuU29ja2V0LCBjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBQYXNzaXZlIGRhdGEgY29ubmVjdGlvbiBhY2NlcHRlZDogJHtjb25uSWR9IChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSBmYWxzZTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9IChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsIChoYWRFcnJvcikgPT4ge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPT09IHNvY2tldCkge1xuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSB0cnVlO1xuICAgICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEF5bsSxIGFuZGEgeWFsbsSxemNhIGJpciBkYXRhIGJhxJ9sYW50xLFzxLEga3VsbGFuxLFsxLFyXG4gICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgJiYgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCAhPT0gc29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95KCk7XG4gICAgfVxuICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBzb2NrZXQ7XG4gICAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIHBlbmRpbmdEYXRhU29ja2V0IGFzc2lnbmVkIChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICB0aGlzLnRyeVNlcnZlRGF0YSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIExJU1QvUkVUUi9TVE9SIGnDp2luIHZlcmkgYmHEn2xhbnTEsXPEsW7EsSBoYXrEsXJsYTpcbiAgICogcGFzaWYgbW9kZGEgaXN0ZW1jaW5pbiBiYcSfbGFubWFzxLEgYmVrbGVuaXIsIGFrdGlmIG1vZGRhIChQT1JUKSBzdW51Y3UgYmHEn2xhbsSxci5cbiAgICovXG4gIHByaXZhdGUgZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAvLyAxNTAnZGVuIHNvbnJhIGlzdGVtY2lkZSBzb25zdXogYmVrbGVtZSBvbG1hc8SxbjogZW4gZmF6IERBVEFfV0FJVF9USU1FT1VUX01TIGJla2xlXG4gICAgdGhpcy5hcm1EYXRhV2FpdFRpbWVvdXQoY29ubklkKTtcbiAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIGVuc3VyZURhdGFDb25uZWN0aW9uKCR7Y29ubklkfSk6IHBlbmRpbmcgc29ja2V0ICR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldCA/IGBleGlzdHMgKHJlbW90ZSBwb3J0ICR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldC5yZW1vdGVQb3J0fSwgZGVzdHJveWVkPSR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95ZWR9KWAgOiAnbm9uZSd9YCk7XG4gICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgJiYgIXRoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICB0aGlzLnRyeVNlcnZlRGF0YSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgIGlmICghY29ubiB8fCBjb25uLmRhdGFNb2RlICE9PSAnYWN0aXZlJyB8fCAhY29ubi5hY3RpdmVEYXRhVGFyZ2V0KSB7XG4gICAgICAvLyBQYXNpZiBtb2Q6IGlzdGVtY2luaW4gYmFnbGFubWFzaSBiZWtsZW5pclxuICAgICAgaWYgKFxuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgJiZcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgIT09IG51bGwgJiZcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9PT0gY29ubklkXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBlbmRpbmdTdG9yRmlsZTtcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gbnVsbDtcbiAgICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhdGhNb2QgPSByZXF1aXJlKCdwYXRoJyk7XG4gICAgICAgICAgY29uc3QgZnNNb2QgPSByZXF1aXJlKCdmcycpO1xuICAgICAgICAgIGZzTW9kLm1rZGlyU3luYyhwYXRoTW9kLmRpcm5hbWUoZmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIGZzTW9kLndyaXRlRmlsZVN5bmMoZmlsZSwgJycpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gU1RPUiBlYXJseSBjbG9zZSBmaWxlIGVycm9yOiAkeyhlIGFzIEVycm9yKS5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgMjI2LCAnU3RvciBjb21wbGV0ZScpO1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUiBjb21wbGV0ZWQgdmlhIGVhcmx5IGNsb3NlOiAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gY29ubi5hY3RpdmVEYXRhVGFyZ2V0O1xuICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHRhcmdldC5wb3J0LCB0YXJnZXQuaXAsICgpID0+IHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEFjdGl2ZSBkYXRhIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWQ6ICR7dGFyZ2V0LmlwfToke3RhcmdldC5wb3J0fWApO1xuICAgICAgdGhpcy5oYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oc29ja2V0LCBjb25uSWQpO1xuICAgIH0pO1xuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQWN0aXZlIGRhdGEgY29ubmVjdGlvbiBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEJla2xleWVuIExJU1QvUkVUUi9TVE9SIGFrdGFyxLFtxLFuxLEsIHZlcmkgYmHEn2xhbnTEsXPEsSBoYXrEsXJzYSBiYcWfbGF0LlxuICAgKiAyMjYgeWFuxLF0xLFuxLEgdmVyaSBnZXLDp2VrdGVuIGfDtm5kZXJpbGRpa3RlbiAvIGFsxLFuZMSxa3RhbiBzb25yYSBnw7ZuZGVyLlxuICAgKi9cbiAgcHJpdmF0ZSB0cnlTZXJ2ZURhdGEoKTogdm9pZCB7XG4gICAgY29uc3Qgc29ja2V0ID0gdGhpcy5wZW5kaW5nRGF0YVNvY2tldDtcbiAgICBpZiAoIXNvY2tldCB8fCBzb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIHRyeVNlcnZlRGF0YSBza2lwcGVkOiBzb2NrZXQgJHtzb2NrZXQgPyBgZGVzdHJveWVkIChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgIDogJ25vbmUnfSwgcGVuZGluZyBMSVNUPSR7dGhpcy5wZW5kaW5nTGlzdENvbm5JZCAhPT0gbnVsbH0gUkVUUj0ke3RoaXMucGVuZGluZ1JldHJDb25uSWQgIT09IG51bGx9IFNUT1I9JHt0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIExJU1QgLyBOTFNUXG4gICAgaWYgKHRoaXMucGVuZGluZ0xpc3REYXRhICE9PSBudWxsICYmIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnBlbmRpbmdMaXN0RGF0YTtcbiAgICAgIGNvbnN0IGNvbm5JZCA9IHRoaXMucGVuZGluZ0xpc3RDb25uSWQ7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0RGF0YSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0Q29ubklkID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTElTVCBkYXRhIHNlbmRpbmc6ICR7ZGF0YS5sZW5ndGh9IGJ5dGVzYCk7XG4gICAgICBzb2NrZXQub25jZSgnZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5MSVNUX0VORCwgJ0RpcmVjdG9yeSBsaXN0aW5nIGNvbXBsZXRlJyk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC53cml0ZShkYXRhLCAoKSA9PiBzb2NrZXQuZW5kKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFJFVFJcbiAgICBpZiAodGhpcy5wZW5kaW5nUmV0ckZpbGUgIT09IG51bGwgJiYgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMucGVuZGluZ1JldHJGaWxlO1xuICAgICAgY29uc3QgY29ubklkID0gdGhpcy5wZW5kaW5nUmV0ckNvbm5JZDtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJGaWxlID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ1JldHJDb25uSWQgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG5cbiAgICAgIHRoaXMuY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBSRVRSIGZpbGUgc2VuZGluZzogJHtmaWxlfWApO1xuICAgICAgY29uc3QgcmVhZFN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZSk7XG4gICAgICByZWFkU3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBSRVRSIHJlYWQgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLkZJTEVfTk9UX0ZPVU5ELCAnQ2Fubm90IHJlYWQgZmlsZScpO1xuICAgICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQub25jZSgnZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5SRVRSX09LLCAnUmV0ciBjb21wbGV0ZScpO1xuICAgICAgfSk7XG4gICAgICByZWFkU3RyZWFtLnBpcGUoc29ja2V0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTVE9SXG4gICAgaWYgKHRoaXMucGVuZGluZ1N0b3JGaWxlICE9PSBudWxsICYmIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBlbmRpbmdTdG9yRmlsZTtcbiAgICAgIGNvbnN0IGNvbm5JZCA9IHRoaXMucGVuZGluZ1N0b3JDb25uSWQ7XG4gICAgICB0aGlzLnBlbmRpbmdTdG9yRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUiBmaWxlIHJlY2VpdmluZzogJHtmaWxlfWApO1xuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKTtcbiAgICAgIHdyaXRlU3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTVE9SIHdyaXRlIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5JTlRFUk5BTF9FUlIsICdDYW5ub3Qgd3JpdGUgZmlsZScpO1xuICAgICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgICB3cml0ZVN0cmVhbS5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5TVE9SX09LLCAnU3RvciBjb21wbGV0ZScpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQucGlwZSh3cml0ZVN0cmVhbSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSGVuw7x6IGJla2xleWVuIGFrdGFyxLFtIHlvazogYmHEn2xhbnTEsSBiaXIgc29ucmFraSBrb211dCBpw6dpbiBhw6fEsWsgdHV0dWx1clxuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsSBiZWtsZW1lIHphbWFubGF5xLFjxLFzxLFuxLEgYmHFn2xhdCAoaWtpbmNpIGtleiBiYcWfbGF0xLFsbWF6KVxuICAgKi9cbiAgcHJpdmF0ZSBhcm1EYXRhV2FpdFRpbWVvdXQoY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kYXRhV2FpdFRpbWVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGF0YVdhaXRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5kYXRhV2FpdFRpbWVyID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgICByZXR1cm47IC8vIHZlcmkgYmHEn2xhbnTEsXPEsSBoYXrEsXIsIHNvcnVuIHlva1xuICAgICAgfVxuICAgICAgY29uc3QgcGVuZGluZyA9XG4gICAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwgfHwgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbCB8fCB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsO1xuICAgICAgaWYgKCFwZW5kaW5nIHx8IHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IGNvbm5JZCAmJiB0aGlzLnBlbmRpbmdSZXRyQ29ubklkICE9PSBjb25uSWQgJiYgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCAhPT0gY29ubklkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIExvZ2dlci53YXJuKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gdGltZW91dDogJHtjb25uSWR9IChubyBjb25uZWN0aW9uIGFmdGVyIDE1MClgKTtcbiAgICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG4gICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5UUkFOU0ZFUl9BQk9SVEVELCAnVHJhbnNmZXIgYWJvcnRlZDogZGF0YSBjb25uZWN0aW9uIHRpbWVvdXQnKTtcbiAgICB9LCBGdHBTZXJ2ZXIuREFUQV9XQUlUX1RJTUVPVVRfTVMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsSBiZWtsZW1lIHphbWFubGF5xLFjxLFzxLFuxLEgaXB0YWwgZXRcbiAgICovXG4gIHByaXZhdGUgY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGF0YVdhaXRUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGF0YVdhaXRUaW1lcik7XG4gICAgICB0aGlzLmRhdGFXYWl0VGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCYcSfbGFudMSxbsSxbiBiZWtsZXllbiBha3RhcsSxbcSxbsSxIHRlbWl6bGUgKHllbmkgUEFTViBnZWxpbmNlIGVza2lzaSBnZcOnZXJzaXogb2x1cilcbiAgICovXG4gIHByaXZhdGUgY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgIGlmICh0aGlzLnBlbmRpbmdMaXN0Q29ubklkID09PSBjb25uSWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3REYXRhID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9PT0gY29ubklkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyQ29ubklkID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW5hIHlhbsSxdCBnw7ZuZGVyXG4gICAqL1xuICBwcml2YXRlIHdyaXRlQ29udHJvbChjb25uSWQ6IHN0cmluZywgY29kZTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubiAmJiBjb25uLnNvY2tldCkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBjb2RlO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICBjb25uLnNvY2tldC53cml0ZShgJHtjb2RlfSAke21lc3NhZ2V9YCArICdcXHJcXG4nKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEJhxJ9sYW50xLF5xLEga2FwYXRcbiAgICovXG4gIHB1YmxpYyBjbG9zZUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xuICAgIC8vIEJhxJ9sYW50xLF5YSBhaXQgdGFtcG9uLCBrdXlydWsgdmUgYmVrbGV5ZW4gYWt0YXLEsW0ga2F5xLF0bGFyxLFuxLEgdGVtaXpsZVxuICAgIHRoaXMuaW5wdXRCdWZmZXJzLmRlbGV0ZShjb25uSWQpO1xuICAgIHRoaXMuY29tbWFuZFF1ZXVlcy5kZWxldGUoY29ubklkKTtcbiAgICB0aGlzLmNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQpO1xuICAgIGlmICh0aGlzLnBhc3NpdmVDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wYXNzaXZlQ29ubklkID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubikge1xuICAgICAgY29ubi5zb2NrZXQ/LmVuZCgpO1xuICAgICAgdGhpcy5jb25uZWN0aW9ucy5kZWxldGUoY29ubklkKTtcbiAgICAgIHRoaXMuY29ubmVjdGlvbkNvdW50LS07XG4gICAgICBpZiAocmVhc29uKSB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBjbG9zZWQ6ICR7Y29ubklkfSAocmVhc29uOiAke3JlYXNvbn0pYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gY2xvc2VkOiAke2Nvbm5JZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==