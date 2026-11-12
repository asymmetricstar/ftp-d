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
const types_1 = require("../types");
const userManager_1 = require("../userManager");
const database_1 = require("../db/database");
const logger_1 = require("../utils/logger");
const Commands = __importStar(require("../commands"));
const DEFAULT_CONFIG = {
    port: 21,
    dataPort: 20,
    maxConnections: 100,
    logLevel: 'info',
    banner: '',
    passivePortRange: { min: 50000, max: 50050 },
    dbPath: './ftpd.db',
};
const SETTING_KEYS = {
    port: 'ftp.port',
    dataPort: 'ftp.dataPort',
    maxConnections: 'ftp.maxConnections',
    logLevel: 'ftp.logLevel',
    banner: 'ftp.banner',
    passivePortRange: 'ftp.passivePortRange',
    passiveIp: 'ftp.passiveIp',
    ip: 'ftp.ip',
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
        this.db = new database_1.DatabaseManager(config.dbPath);
        this.db.init();
        this.runtime = this.loadConfigFromSettings(config);
        this.maxConnections = this.runtime.maxConnections || DEFAULT_CONFIG.maxConnections;
        const configuredServerIp = this.normalizeIp(this.runtime.ip);
        if (configuredServerIp && configuredServerIp !== '127.0.0.1' && configuredServerIp !== '0.0.0.0') {
            this.serverIp = configuredServerIp;
        }
        if (typeof this.runtime.passiveIp === 'string' && this.runtime.passiveIp.trim() !== '') {
            this.passiveIp = this.runtime.passiveIp.trim();
        }
        else if (this.serverIp) {
            this.passiveIp = this.serverIp;
        }
        const banner = typeof this.runtime.banner === 'string' ? this.runtime.banner.trim() : '';
        this.runtime.banner = banner !== '' ? banner : `${this.runtime.port} FTP Server Ready`;
        this.runtime.passivePortRange = this.normalizePortRange(this.runtime.passivePortRange);
        let logLevelEnum = logger_1.LogLevel.INFO;
        if (this.runtime.logLevel === 'debug') {
            logLevelEnum = logger_1.LogLevel.DEBUG;
        }
        else if (this.runtime.logLevel === 'warn') {
            logLevelEnum = logger_1.LogLevel.WARN;
        }
        else if (this.runtime.logLevel === 'error') {
            logLevelEnum = logger_1.LogLevel.ERROR;
        }
        logger_1.Logger.setLevel(logLevelEnum);
        this.userManager = new userManager_1.UserManager(this.db);
        logger_1.Logger.info(`[FtpServer] FTP server starting...`);
        logger_1.Logger.info(`[FtpServer] Control port: ${this.runtime.port}`);
        logger_1.Logger.info(`[FtpServer] Data port: ${this.runtime.dataPort}`);
        logger_1.Logger.info(`[FtpServer] Max connections: ${this.maxConnections}`);
        logger_1.Logger.info(`[FtpServer] Banner: ${this.runtime.banner}`);
        logger_1.Logger.info(`[FtpServer] PASV port range: ${this.runtime.passivePortRange.min}-${this.runtime.passivePortRange.max}`);
        logger_1.Logger.info(`[FtpServer] Server IP: ${this.serverIp ?? 'auto (all interfaces)'}`);
        logger_1.Logger.info(`[FtpServer] SQLite database: ftpd.db`);
    }
    loadConfigFromSettings(provided) {
        const config = {
            port: DEFAULT_CONFIG.port,
            dataPort: DEFAULT_CONFIG.dataPort,
            maxConnections: DEFAULT_CONFIG.maxConnections,
            logLevel: DEFAULT_CONFIG.logLevel,
            banner: DEFAULT_CONFIG.banner,
            passivePortRange: { ...DEFAULT_CONFIG.passivePortRange },
            dbPath: provided.dbPath ?? DEFAULT_CONFIG.dbPath,
        };
        for (const [configKey, settingKey] of Object.entries(SETTING_KEYS)) {
            const dbValue = this.db.getSetting(settingKey);
            let value = undefined;
            let loaded = false;
            if (dbValue !== null && dbValue !== '' && dbValue !== 'undefined' && dbValue !== 'null') {
                try {
                    switch (configKey) {
                        case 'port':
                        case 'dataPort':
                        case 'maxConnections': {
                            const num = Number(dbValue);
                            if (Number.isFinite(num)) {
                                value = num;
                                loaded = true;
                            }
                            break;
                        }
                        case 'passivePortRange': {
                            const parts = String(dbValue).split(':');
                            const min = Number(parts[0]);
                            const max = Number(parts[1]);
                            if (parts.length === 2 && Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0 && min <= max) {
                                value = { min, max };
                                loaded = true;
                            }
                            break;
                        }
                        default: {
                            value = dbValue;
                            loaded = true;
                            break;
                        }
                    }
                }
                catch (e) { }
            }
            const providedValue = provided[configKey];
            if (!loaded && providedValue !== undefined && providedValue !== null) {
                value = providedValue;
                loaded = true;
            }
            if (!loaded) {
                value = DEFAULT_CONFIG[configKey];
            }
            if (value !== undefined && value !== null) {
                config[configKey] = value;
                if (dbValue === null || dbValue === undefined || dbValue === "") {
                    this.saveSettingToDb(settingKey, value);
                }
            }
        }
        return config;
    }
    saveSettingToDb(key, value) {
        let strValue;
        if (value && typeof value === 'object') {
            const obj = value;
            if (obj.min !== undefined && obj.max !== undefined) {
                strValue = `${obj.min}:${obj.max}`;
            }
            else {
                strValue = JSON.stringify(value);
            }
        }
        else {
            strValue = String(value);
        }
        this.db.setSetting(key, strValue);
    }
    updateSetting(key, value) {
        this.runtime[key] = value;
        const settingKey = SETTING_KEYS[key];
        if (settingKey) {
            this.saveSettingToDb(settingKey, value);
        }
        if (key === 'logLevel') {
            let logLevelEnum = logger_1.LogLevel.INFO;
            if (value === 'debug')
                logLevelEnum = logger_1.LogLevel.DEBUG;
            else if (value === 'warn')
                logLevelEnum = logger_1.LogLevel.WARN;
            else if (value === 'error')
                logLevelEnum = logger_1.LogLevel.ERROR;
            logger_1.Logger.setLevel(logLevelEnum);
        }
        if (key === 'banner') {
            const banner = typeof value === 'string' ? value.trim() : '';
            this.runtime.banner = banner !== '' ? banner : `${this.runtime.port} FTP Server Ready`;
        }
    }
    getDb() {
        return this.db;
    }
    getUserManager() {
        return this.userManager;
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
        const { min, max } = this.runtime.passivePortRange;
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
            this.server.listen({ port: this.runtime.port, host: this.serverIp ?? undefined }, () => {
                logger_1.Logger.info(`[FtpServer] FTP server started: ftp://${this.serverIp ?? this.resolveListenIp()}:${this.runtime.port}`);
                logger_1.Logger.info(`[FtpServer] SQLite database: ftpd.db`);
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
            this.dataServer.listen(this.runtime.dataPort, () => {
                logger_1.Logger.info(`[FtpServer] Data server started: port ${this.runtime.dataPort}`);
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
        socket?.write(`220 ${this.runtime.banner}\r\n`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnRwU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvRnRwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLEdBQUcsZ0NBQVk7QUFDM0IsTUFBWSxFQUFFLCtCQUFXO0FBRXpCLG9DQUFpRjtBQUNqRixnREFBNkM7QUFDN0MsNkNBQWlEO0FBRWpELDRDQUFtRDtBQUNuRCxNQUFZLFFBQVEsd0NBQW9CO0FBc0J4QyxNQUFNLGNBQWMsR0FBeUI7SUFDM0MsSUFBSSxFQUFFLEVBQUU7SUFDUixRQUFRLEVBQUUsRUFBRTtJQUNaLGNBQWMsRUFBRSxHQUFHO0lBQ25CLFFBQVEsRUFBRSxNQUFNO0lBRWhCLE1BQU0sRUFBRSxFQUFFO0lBRVYsZ0JBQWdCLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7SUFDNUMsTUFBTSxFQUFFLFdBQVc7Q0FDcEIsQ0FBQztBQUlGLE1BQU0sWUFBWSxHQUEyQjtJQUMzQyxJQUFJLEVBQUUsVUFBVTtJQUNoQixRQUFRLEVBQUUsY0FBYztJQUN4QixjQUFjLEVBQUUsb0JBQW9CO0lBQ3BDLFFBQVEsRUFBRSxjQUFjO0lBQ3hCLE1BQU0sRUFBRSxZQUFZO0lBQ3BCLGdCQUFnQixFQUFFLHNCQUFzQjtJQUN4QyxTQUFTLEVBQUUsZUFBZTtJQUMxQixFQUFFLEVBQUUsUUFBUTtDQUNiLENBQUM7QUFLRjtJQXNDRSxZQUFZLE1BQU0sR0FBMEIsRUFBRTtRQXJDdEMsV0FBTSxHQUFzQixJQUFJLENBQUM7UUFDakMsZUFBVSxHQUFzQixJQUFJLENBQUM7UUFDckMsZ0JBQVcsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNwRCxvQkFBZSxHQUFxQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRzlDLGdCQUFXLEdBQXVCLElB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QztnQkFDYixlQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxNQUFNLGFBQWEsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUM1RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1IsZUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUN4RCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7Q0FDRjs7QUFoeUJ5Qiw4QkFBb0IsR0FBRyxLQUFLLEFBQVIsQ0FBUyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCwgU2VydmVyQ29uZmlnIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyBEYXRhYmFzZU1hbmFnZXIgfSBmcm9tICcuLi9kYi9kYXRhYmFzZSc7XG5pbXBvcnQgeyBlbnN1cmVEaXJlY3RvcnlFeGlzdHMgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuaW1wb3J0IHsgTG9nZ2VyLCBMb2dMZXZlbCB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgKiBhcyBDb21tYW5kcyBmcm9tICcuLi9jb21tYW5kcyc7XG5cbi8qKlxuICogRGFoaWxpIHN1bnVjdSBheWFybGFyxLEgKHNldHRpbmdzIHRhYmxvc3VuZGFuIHnDvGtsZW5pciAvIHNha2xhbsSxcilcbiAqIFB1YmxpYyBTZXJ2ZXJDb25maWcgeWFsbsSxemNhIGRiUGF0aCwgYmFubmVyIHZlIGxvZ0xldmVsIGnDp2VyaXI7XG4gKiBwb3J0IC8gZGF0YVBvcnQgLyBtYXhDb25uZWN0aW9ucyAvIHBhc3NpdmVQb3J0UmFuZ2UgZGF0YWJhc2UnZGVuIGdlbGlyLlxuICovXG5pbnRlcmZhY2UgSW50ZXJuYWxTZXJ2ZXJDb25maWcge1xuICBwb3J0OiBudW1iZXI7XG4gIGRhdGFQb3J0OiBudW1iZXI7XG4gIG1heENvbm5lY3Rpb25zOiBudW1iZXI7XG4gIGxvZ0xldmVsOiAnZGVidWcnIHwgJ2luZm8nIHwgJ3dhcm4nIHwgJ2Vycm9yJztcbiAgYmFubmVyOiBzdHJpbmc7XG4gIHBhc3NpdmVQb3J0UmFuZ2U6IHsgbWluOiBudW1iZXI7IG1heDogbnVtYmVyIH07XG4gIHBhc3NpdmVJcD86IHN0cmluZztcbiAgaXA/OiBzdHJpbmc7XG4gIGRiUGF0aD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBEZWZhdWx0IGF5YXJsYXIgKHNldHRpbmdzIHRhYmxvc3VuZGEgZGXEn2VyIHlva3NhIGJ1IGRlxJ9lcmxlciBrdWxsYW7EsWzEsXIpXG4gKi9cbmNvbnN0IERFRkFVTFRfQ09ORklHOiBJbnRlcm5hbFNlcnZlckNvbmZpZyA9IHtcbiAgcG9ydDogMjEsXG4gIGRhdGFQb3J0OiAyMCxcbiAgbWF4Q29ubmVjdGlvbnM6IDEwMCxcbiAgbG9nTGV2ZWw6ICdpbmZvJyxcbiAgLy8gMjIwIGthcsWfxLFsYW1hIG1lc2FqxLE7IGJvxZ8gYsSxcmFrxLFsxLFyc2Egb3RvbWF0aWsgb2xhcmFrIFwiPHBvcnQ+IEZUUCBTZXJ2ZXIgUmVhZHlcIiDDvHJldGlsaXJcbiAgYmFubmVyOiAnJyxcbiAgLy8gUEFTViB2ZXJpIGJhxJ9sYW50xLEgcG9ydGxhcsSxIGJ1IGFyYWzEsWt0YW4gc2XDp2lsaXJcbiAgcGFzc2l2ZVBvcnRSYW5nZTogeyBtaW46IDUwMDAwLCBtYXg6IDUwMDUwIH0sXG4gIGRiUGF0aDogJy4vZnRwZC5kYicsXG59O1xuLyoqXG4gKiBBeWFyIGFuYWh0YXJsYXLEsW7EsW4gc2V0dGluZ3MgdGFibG9zdW5kYWtpIGthcsWfxLFsxLFrbGFyxLFcbiAqL1xuY29uc3QgU0VUVElOR19LRVlTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBwb3J0OiAnZnRwLnBvcnQnLFxuICBkYXRhUG9ydDogJ2Z0cC5kYXRhUG9ydCcsXG4gIG1heENvbm5lY3Rpb25zOiAnZnRwLm1heENvbm5lY3Rpb25zJyxcbiAgbG9nTGV2ZWw6ICdmdHAubG9nTGV2ZWwnLFxuICBiYW5uZXI6ICdmdHAuYmFubmVyJyxcbiAgcGFzc2l2ZVBvcnRSYW5nZTogJ2Z0cC5wYXNzaXZlUG9ydFJhbmdlJyxcbiAgcGFzc2l2ZUlwOiAnZnRwLnBhc3NpdmVJcCcsXG4gIGlwOiAnZnRwLmlwJyxcbn07XG5cbi8qKlxuICogRlRQIFN1bnVjdXN1IGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBGdHBTZXJ2ZXIge1xuICBwcml2YXRlIHNlcnZlcjogbmV0LlNlcnZlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRhdGFTZXJ2ZXI6IG5ldC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uczogTWFwPHN0cmluZywgRnRwQ29ubmVjdGlvbj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZGF0YUNvbm5lY3Rpb25zOiBNYXA8c3RyaW5nLCBhbnk+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHJ1bnRpbWU6IEludGVybmFsU2VydmVyQ29uZmlnO1xuICBwcml2YXRlIGRiOiBEYXRhYmFzZU1hbmFnZXI7XG4gIHByaXZhdGUgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGlvbkNvdW50OiBudW1iZXIgPSAwO1xuICBwcml2YXRlIG1heENvbm5lY3Rpb25zOiBudW1iZXI7XG4gIHByaXZhdGUgcGFzc2l2ZU1vZGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBwYXNzaXZlSXA6IHN0cmluZyB8IG51bGwgPSBudWxsOyAvLyBudWxsIGlzZSBzdW51Y3VudW4ga2VuZGluZSB1bGHFn8SxbGFiaWxpciBJUCBvdG9tYXRpayBzZcOnaWxpclxuICBwcml2YXRlIHNlcnZlcklwOiBzdHJpbmcgfCBudWxsID0gbnVsbDsgLy8gQXlhcmxhbmFuIHN1bnVjdSBJUDsgbnVsbCBpc2UgZGlubGVtZSBhZHJlc2kgb3RvbWF0aWsgc2VjaWxpclxuICBwcml2YXRlIHBhc3NpdmVEYXRhU2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGFzc2l2ZURhdGFQb3J0OiBudW1iZXIgPSA1MDAwMDtcbiAgLyoqIFBBU1YgcG9ydCBhcmFsxLHEn8SxIMO8emVyaW5kZSBkb2xhxZ9hbiBpbWxlw6cgKi9cbiAgcHJpdmF0ZSBwYXNzaXZlUG9ydEN1cnNvcjogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBwZW5kaW5nTGlzdERhdGE6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdMaXN0Q29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nUmV0ckZpbGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdSZXRyQ29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nU3RvckZpbGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdTdG9yQ29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgLyoqIFBhc2lmIHZlcmkgYmFnbGFudGlzaSBha3RhcmltIGF0YW5tYWRhbiBvbmNlIGthcGFuZGkgKGVya2VuIGthcGFubWEpICovXG4gIHByaXZhdGUgZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseTogYm9vbGVhbiA9IGZhbHNlO1xuICAvKiogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgZ2VsZW4geWFyxLFtICh0YW1hbWxhbm1hbcSxxZ8pIGtvbXV0IHNhdMSxcmxhcsSxICovXG4gIHByaXZhdGUgaW5wdXRCdWZmZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpO1xuICAvKiogQmHEn2xhbnTEsSBiYcWfxLFuYSBrb211dGxhcsSxbiBzxLFyYXlsYSBpxZ9sZW5tZXNpIGnDp2luIGt1eXJ1ayAqL1xuICBwcml2YXRlIGNvbW1hbmRRdWV1ZXM6IE1hcDxzdHJpbmcsIFByb21pc2U8dm9pZD4+ID0gbmV3IE1hcCgpO1xuICAvKiogSGVuw7x6IGt1bGxhbsSxbG1hbcSxxZ8gcGFzaWYvYWt0aWYgZGF0YSBiYcSfbGFudMSxc8SxICovXG4gIHByaXZhdGUgcGVuZGluZ0RhdGFTb2NrZXQ6IG5ldC5Tb2NrZXQgfCBudWxsID0gbnVsbDtcbiAgLyoqIFNvbiBQQVNWIGtvbXV0dW51IHZlcmVuIGJhxJ9sYW50xLEgKGRhdGEgYmHEn2xhbnTEsXPEsSBzYWhpYmkpICovXG4gIHByaXZhdGUgcGFzc2l2ZUNvbm5JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIC8qKiAxNTAgZ8O2bmRlcmlsZGlrdGVuIHNvbnJhIHZlcmkgYmHEn2xhbnTEsXPEsSBnZWxtZXpzZSBhc8SxbMSxIGthbG1hbWFrIGnDp2luIHphbWFubGF5xLFjxLEgKi9cbiAgcHJpdmF0ZSBkYXRhV2FpdFRpbWVyOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xuICAvKiogVmVyaSBiYcSfbGFudMSxc8SxIGnDp2luIGF6YW1pIGJla2xlbWUgc8O8cmVzaSAobXMpICovXG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERBVEFfV0FJVF9USU1FT1VUX01TID0gMTUwMDA7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBQYXJ0aWFsPFNlcnZlckNvbmZpZz4gPSB7fSkge1xuICAgIC8vIFNRTGl0ZSB2ZXJpdGFiYW7EsW7EsSBiYcWfbGF0ICh1c2VycyB2ZSBzZXR0aW5ncyB0YWJsb2xhcsSxKVxuICAgIHRoaXMuZGIgPSBuZXcgRGF0YWJhc2VNYW5hZ2VyKGNvbmZpZy5kYlBhdGgpO1xuICAgIHRoaXMuZGIuaW5pdCgpO1xuXG4gICAgLy8gQXlhcmxhcsSxIHNldHRpbmdzIHRhYmxvc3VuZGFuIHnDvGtsZSwgeW9rc2EgdmFyc2F5xLFsYW5sYXLEsSBrdWxsYW5cbiAgICB0aGlzLnJ1bnRpbWUgPSB0aGlzLmxvYWRDb25maWdGcm9tU2V0dGluZ3MoY29uZmlnKSBhcyBJbnRlcm5hbFNlcnZlckNvbmZpZztcblxuICAgIHRoaXMubWF4Q29ubmVjdGlvbnMgPSB0aGlzLnJ1bnRpbWUubWF4Q29ubmVjdGlvbnMgfHwgREVGQVVMVF9DT05GSUcubWF4Q29ubmVjdGlvbnM7XG4gICAgLy8gU3VudWN1IElQOiBiaW5kIGFkcmVzaSB2ZSBQQVNWIHlhbsSxdMSxbmRhIGt1bGxhbsSxbGFjYWsgYWRyZXNcbiAgICBjb25zdCBjb25maWd1cmVkU2VydmVySXAgPSB0aGlzLm5vcm1hbGl6ZUlwKHRoaXMucnVudGltZS5pcCk7XG4gICAgaWYgKGNvbmZpZ3VyZWRTZXJ2ZXJJcCAmJiBjb25maWd1cmVkU2VydmVySXAgIT09ICcxMjcuMC4wLjEnICYmIGNvbmZpZ3VyZWRTZXJ2ZXJJcCAhPT0gJzAuMC4wLjAnKSB7XG4gICAgICB0aGlzLnNlcnZlcklwID0gY29uZmlndXJlZFNlcnZlcklwO1xuICAgIH1cblxuICAgIC8vIEHDp8Sxa8OnYSB5YXDEsWxhbmTEsXLEsWxtxLHFnyBQQVNWIElQIHlva3NhLCBzdW51Y3UgSVAga3VsbGFuXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJ1bnRpbWUucGFzc2l2ZUlwID09PSAnc3RyaW5nJyAmJiB0aGlzLnJ1bnRpbWUucGFzc2l2ZUlwLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgIHRoaXMucGFzc2l2ZUlwID0gdGhpcy5ydW50aW1lLnBhc3NpdmVJcC50cmltKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNlcnZlcklwKSB7XG4gICAgICB0aGlzLnBhc3NpdmVJcCA9IHRoaXMuc2VydmVySXA7XG4gICAgfVxuXG4gICAgLy8gQmFubmVyOiBib8WfIGLEsXJha8SxbMSxcnNhIFwiPHBvcnQ+IEZUUCBTZXJ2ZXIgUmVhZHlcIlxuICAgIGNvbnN0IGJhbm5lciA9IHR5cGVvZiB0aGlzLnJ1bnRpbWUuYmFubmVyID09PSAnc3RyaW5nJyA/IHRoaXMucnVudGltZS5iYW5uZXIudHJpbSgpIDogJyc7XG4gICAgdGhpcy5ydW50aW1lLmJhbm5lciA9IGJhbm5lciAhPT0gJycgPyBiYW5uZXIgOiBgJHt0aGlzLnJ1bnRpbWUucG9ydH0gRlRQIFNlcnZlciBSZWFkeWA7XG5cbiAgICAvLyBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYVxuICAgIHRoaXMucnVudGltZS5wYXNzaXZlUG9ydFJhbmdlID0gdGhpcy5ub3JtYWxpemVQb3J0UmFuZ2UodGhpcy5ydW50aW1lLnBhc3NpdmVQb3J0UmFuZ2UpO1xuICAgIC8vIExvZ2dlciBzZXZpeWVzaW5pIGF5YXJsYVxuICAgIGxldCBsb2dMZXZlbEVudW06IExvZ0xldmVsID0gTG9nTGV2ZWwuSU5GTztcbiAgICBpZiAodGhpcy5ydW50aW1lLmxvZ0xldmVsID09PSAnZGVidWcnKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5ERUJVRztcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVudGltZS5sb2dMZXZlbCA9PT0gJ3dhcm4nKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5XQVJOO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ydW50aW1lLmxvZ0xldmVsID09PSAnZXJyb3InKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5FUlJPUjtcbiAgICB9XG4gICAgTG9nZ2VyLnNldExldmVsKGxvZ0xldmVsRW51bSk7XG4gICAgLy8gVXNlck1hbmFnZXInxLEgYmHFn2xhdCAoU1FMaXRlICd1c2VycycgdGFibG9zdSDDvHplcmluZGVuKVxuICAgIHRoaXMudXNlck1hbmFnZXIgPSBuZXcgVXNlck1hbmFnZXIodGhpcy5kYik7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEZUUCBzZXJ2ZXIgc3RhcnRpbmcuLi5gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29udHJvbCBwb3J0OiAke3RoaXMucnVudGltZS5wb3J0fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIHBvcnQ6ICR7dGhpcy5ydW50aW1lLmRhdGFQb3J0fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBNYXggY29ubmVjdGlvbnM6ICR7dGhpcy5tYXhDb25uZWN0aW9uc31gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQmFubmVyOiAke3RoaXMucnVudGltZS5iYW5uZXJ9YCk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBBU1YgcG9ydCByYW5nZTogJHt0aGlzLnJ1bnRpbWUucGFzc2l2ZVBvcnRSYW5nZS5taW59LSR7dGhpcy5ydW50aW1lLnBhc3NpdmVQb3J0UmFuZ2UubWF4fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTZXJ2ZXIgSVA6ICR7dGhpcy5zZXJ2ZXJJcCA/PyAnYXV0byAoYWxsIGludGVyZmFjZXMpJ31gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1FMaXRlIGRhdGFiYXNlOiBmdHBkLmRiYCk7XG4gIH1cblxuICAvKipcbiAgICogQXlhcmxhcsSxIFNRTGl0ZSAnc2V0dGluZ3MnIHRhYmxvc3VuZGFuIHnDvGtsZS5cbiAgICogRcSfZXIgYXlhciB5b2tzYSB2YXJzYXnEsWxhbiBkZcSfZXJpIGt1bGxhbiB2ZSBzZXR0aW5ncyB0YWJsb3N1bmEga2F5ZGV0LlxuICAgKi9cbiAgcHJpdmF0ZSBsb2FkQ29uZmlnRnJvbVNldHRpbmdzKHByb3ZpZGVkOiBQYXJ0aWFsPFNlcnZlckNvbmZpZz4pOiBJbnRlcm5hbFNlcnZlckNvbmZpZyB7XG4gICAgY29uc3QgY29uZmlnOiBJbnRlcm5hbFNlcnZlckNvbmZpZyA9IHtcbiAgICAgIHBvcnQ6IERFRkFVTFRfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhUG9ydDogREVGQVVMVF9DT05GSUcuZGF0YVBvcnQsXG4gICAgICBtYXhDb25uZWN0aW9uczogREVGQVVMVF9DT05GSUcubWF4Q29ubmVjdGlvbnMsXG4gICAgICBsb2dMZXZlbDogREVGQVVMVF9DT05GSUcubG9nTGV2ZWwsXG4gICAgICBiYW5uZXI6IERFRkFVTFRfQ09ORklHLmJhbm5lcixcbiAgICAgIHBhc3NpdmVQb3J0UmFuZ2U6IHsgLi4uREVGQVVMVF9DT05GSUcucGFzc2l2ZVBvcnRSYW5nZSB9LFxuICAgICAgZGJQYXRoOiBwcm92aWRlZC5kYlBhdGggPz8gREVGQVVMVF9DT05GSUcuZGJQYXRoLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IFtjb25maWdLZXksIHNldHRpbmdLZXldIG9mIE9iamVjdC5lbnRyaWVzKFNFVFRJTkdfS0VZUykpIHtcbiAgICAgIGNvbnN0IGRiVmFsdWUgPSB0aGlzLmRiLmdldFNldHRpbmcoc2V0dGluZ0tleSk7XG4gICAgICBsZXQgdmFsdWU6IGFueSA9IHVuZGVmaW5lZDtcbiAgICAgIGxldCBsb2FkZWQgPSBmYWxzZTtcblxuICAgICAgaWYgKGRiVmFsdWUgIT09IG51bGwgJiYgZGJWYWx1ZSAhPT0gJycgJiYgZGJWYWx1ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGJWYWx1ZSAhPT0gJ251bGwnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3dpdGNoIChjb25maWdLZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3BvcnQnOlxuICAgICAgICAgICAgY2FzZSAnZGF0YVBvcnQnOlxuICAgICAgICAgICAgY2FzZSAnbWF4Q29ubmVjdGlvbnMnOiB7XG4gICAgICAgICAgICAgIGNvbnN0IG51bSA9IE51bWJlcihkYlZhbHVlKTtcbiAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShudW0pKSB7IHZhbHVlID0gbnVtOyBsb2FkZWQgPSB0cnVlOyB9XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncGFzc2l2ZVBvcnRSYW5nZSc6IHtcbiAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBTdHJpbmcoZGJWYWx1ZSkuc3BsaXQoJzonKTtcbiAgICAgICAgICAgICAgY29uc3QgbWluID0gTnVtYmVyKHBhcnRzWzBdKTtcbiAgICAgICAgICAgICAgY29uc3QgbWF4ID0gTnVtYmVyKHBhcnRzWzFdKTtcbiAgICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMiAmJiBOdW1iZXIuaXNGaW5pdGUobWluKSAmJiBOdW1iZXIuaXNGaW5pdGUobWF4KSAmJiBtaW4gPiAwICYmIG1heCA+IDAgJiYgbWluIDw9IG1heCkgeyB2YWx1ZSA9IHsgbWluLCBtYXggfTsgbG9hZGVkID0gdHJ1ZTsgfVxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHsgdmFsdWUgPSBkYlZhbHVlOyBsb2FkZWQgPSB0cnVlOyBicmVhazsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkgeyB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb3ZpZGVkVmFsdWUgPSAocHJvdmlkZWQgYXMgYW55KVtjb25maWdLZXldO1xuICAgICAgaWYgKCFsb2FkZWQgJiYgcHJvdmlkZWRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIHByb3ZpZGVkVmFsdWUgIT09IG51bGwpIHsgdmFsdWUgPSBwcm92aWRlZFZhbHVlOyBsb2FkZWQgPSB0cnVlOyB9XG5cbiAgICAgIGlmICghbG9hZGVkKSB7IHZhbHVlID0gKERFRkFVTFRfQ09ORklHIGFzIGFueSlbY29uZmlnS2V5XTsgfVxuXG4gICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAoY29uZmlnIGFzIGFueSlbY29uZmlnS2V5XSA9IHZhbHVlO1xuICAgICAgICBpZiAoZGJWYWx1ZSA9PT0gbnVsbCB8fCBkYlZhbHVlID09PSB1bmRlZmluZWQgfHwgZGJWYWx1ZSA9PT0gXCJcIikgeyB0aGlzLnNhdmVTZXR0aW5nVG9EYihzZXR0aW5nS2V5LCB2YWx1ZSk7IH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG4gIHByaXZhdGUgc2F2ZVNldHRpbmdUb0RiKGtleTogc3RyaW5nLCB2YWx1ZTogYW55KTogdm9pZCB7XG4gICAgbGV0IHN0clZhbHVlOiBzdHJpbmc7XG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHZhbHVlIGFzIGFueTtcbiAgICAgIGlmIChvYmoubWluICE9PSB1bmRlZmluZWQgJiYgb2JqLm1heCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN0clZhbHVlID0gYCR7b2JqLm1pbn06JHtvYmoubWF4fWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJWYWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyVmFsdWUgPSBTdHJpbmcodmFsdWUpO1xuICAgIH1cbiAgICB0aGlzLmRiLnNldFNldHRpbmcoa2V5LCBzdHJWYWx1ZSk7XG4gIH1cblxuICAvKipcbiAgICogU3VudWN1IGF5YXLEsW7EsSBnw7xuY2VsbGUgKHJ1bnRpbWUgKyBzZXR0aW5ncyB0YWJsb3N1KVxuICAgKi9cbiAgcHVibGljIHVwZGF0ZVNldHRpbmcoa2V5OiBrZXlvZiBTZXJ2ZXJDb25maWcsIHZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICAodGhpcy5ydW50aW1lIGFzIGFueSlba2V5XSA9IHZhbHVlO1xuICAgIGNvbnN0IHNldHRpbmdLZXkgPSBTRVRUSU5HX0tFWVNba2V5XTtcbiAgICBpZiAoc2V0dGluZ0tleSkge1xuICAgICAgdGhpcy5zYXZlU2V0dGluZ1RvRGIoc2V0dGluZ0tleSwgdmFsdWUpO1xuICAgIH1cbiAgICAvLyDDlnplbCBpxZ9sZW1sZXJcbiAgICBpZiAoa2V5ID09PSAnbG9nTGV2ZWwnKSB7XG4gICAgICBsZXQgbG9nTGV2ZWxFbnVtOiBMb2dMZXZlbCA9IExvZ0xldmVsLklORk87XG4gICAgICBpZiAodmFsdWUgPT09ICdkZWJ1ZycpIGxvZ0xldmVsRW51bSA9IExvZ0xldmVsLkRFQlVHO1xuICAgICAgZWxzZSBpZiAodmFsdWUgPT09ICd3YXJuJykgbG9nTGV2ZWxFbnVtID0gTG9nTGV2ZWwuV0FSTjtcbiAgICAgIGVsc2UgaWYgKHZhbHVlID09PSAnZXJyb3InKSBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5FUlJPUjtcbiAgICAgIExvZ2dlci5zZXRMZXZlbChsb2dMZXZlbEVudW0pO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnYmFubmVyJykge1xuICAgICAgY29uc3QgYmFubmVyID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlLnRyaW0oKSA6ICcnO1xuICAgICAgdGhpcy5ydW50aW1lLmJhbm5lciA9IGJhbm5lciAhPT0gJycgPyBiYW5uZXIgOiBgJHt0aGlzLnJ1bnRpbWUucG9ydH0gRlRQIFNlcnZlciBSZWFkeWA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFZlcml0YWJhbsSxIHnDtm5ldGljaXNpbmUgZXJpxZ9pbVxuICAgKi9cbiAgLyoqXG4gICAqIFZlcml0YWJhbsSxIHnDtm5ldGljaXNpbmUgZXJpxZ9pbVxuICAgKi9cbiAgcHVibGljIGdldERiKCk6IERhdGFiYXNlTWFuYWdlciB7XG4gICAgcmV0dXJuIHRoaXMuZGI7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgecO2bmV0aW1pbmUgZXJpxZ9pbSAoQ0xJIC8gdGVzdClcbiAgICovXG4gIHB1YmxpYyBnZXRVc2VyTWFuYWdlcigpOiBVc2VyTWFuYWdlciB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLnVzZXJNYW5hZ2VyO1xuICB9XG4gIC8qKlxuICAgKiBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYTsgZ2XDp2Vyc2l6c2UgdmFyc2F5xLFsYW4gYXJhbMSxxJ9hIGTDtm5cbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplUG9ydFJhbmdlKHJhbmdlOiB7IG1pbj86IG51bWJlcjsgbWF4PzogbnVtYmVyIH0gfCB1bmRlZmluZWQpOiB7IG1pbjogbnVtYmVyOyBtYXg6IG51bWJlciB9IHtcbiAgICBjb25zdCBmYWxsYmFjayA9IHsgLi4uREVGQVVMVF9DT05GSUcucGFzc2l2ZVBvcnRSYW5nZSB9O1xuICAgIGlmICghcmFuZ2UpIHtcbiAgICAgIHJldHVybiBmYWxsYmFjaztcbiAgICB9XG4gICAgY29uc3QgbWluID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWluKSk7XG4gICAgY29uc3QgbWF4ID0gTWF0aC5mbG9vcihOdW1iZXIocmFuZ2UubWF4KSk7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobWluKSB8fCAhTnVtYmVyLmlzRmluaXRlKG1heCkgfHwgbWluIDwgMSB8fCBtYXggPiA2NTUzNSB8fCBtaW4gPiBtYXgpIHtcbiAgICAgIExvZ2dlci53YXJuKGBbRnRwU2VydmVyXSBJbnZhbGlkIFBBU1YgcG9ydCByYW5nZTogJHtyYW5nZS5taW59LSR7cmFuZ2UubWF4fSwgdXNpbmcgZGVmYXVsdCAke2ZhbGxiYWNrLm1pbn0tJHtmYWxsYmFjay5tYXh9YCk7XG4gICAgICByZXR1cm4gZmFsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiB7IG1pbiwgbWF4IH07XG4gIH1cblxuICAvKipcbiAgICogSVB2NC1tYXBwZWQgSVB2NiAoOjpmZmZmOngueC54LngpIHZlIHpvbmUgaWQgKCVldGgwKSBnaWJpIGVrbGVyaSB0ZW1pemxlLlxuICAgKi9cbiAgcHJpdmF0ZSBub3JtYWxpemVJcChhZGRyOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgaWYgKCFhZGRyKSByZXR1cm4gbnVsbDtcbiAgICBsZXQgaXAgPSBhZGRyLnRyaW0oKTtcbiAgICBjb25zdCB6b25lSW5kZXggPSBpcC5pbmRleE9mKCclJyk7XG4gICAgaWYgKHpvbmVJbmRleCAhPT0gLTEpIGlwID0gaXAuc2xpY2UoMCwgem9uZUluZGV4KTtcbiAgICBpZiAoaXAudG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKCc6OmZmZmY6JykpIGlwID0gaXAuc2xpY2UoNyk7XG4gICAgcmV0dXJuIGlwIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogxLBzdGVtY2l5ZSBkw7ZuZMO8csO8bGVjZWsgc3VudWN1bnVuIGtlbmRpbmUgdWxhxZ/EsWxhYmlsaXIgSVB2NCBhZHJlc2luaSBiZWxpcmxlLlxuICAgKlxuICAgKiDDlk5FTUzEsDogUEFTViB5YW7EsXTEsSBpc3RlbWNpbmluIGJhxJ9sYW5hY2HEn8SxIFNVTlVDVSBhZHJlc2luaSBpw6dlcm1lbGlkaXIuXG4gICAqIMSwc3RlbWNpbmluIChyZW1vdGUpIGFkcmVzaSBBU0xBIGt1bGxhbsSxbG1hbWFsxLFkxLFyOyBha3NpIGhhbGRlIGlzdGVtY2lcbiAgICoga2VuZGkgbWFraW5lc2luZSBiYcSfbGFubWF5YSDDp2FsxLHFn8SxciB2ZSBFQ09OTlJFRlVTRUQgYWzEsXIuXG4gICAqXG4gICAqIMOWbmNlbGlrIHPEsXJhc8SxOlxuICAgKiAgIDEuIFlhcMSxbGFuZMSxcm1hZGEgYcOnxLFrw6dhIHZlcmlsZW4gcGFzc2l2ZUlwICh2YXJzYSB2ZSBsb29wYmFjayBkZcSfaWxzZSlcbiAgICogICAyLiBLb250cm9sIGJhxJ9sYW50xLFzxLFuxLFuIHllcmVsIGFkcmVzaSAoaXN0ZW1jaW5pbiBiYcSfbGFuZMSxxJ/EsSBhcmF5w7x6IElQJ3NpKVxuICAgKiAgIDMuIMSwc3RlbWNpIGlsZSBheW7EsSAvMjQgYWx0IGHEn8SxbmRhIG9sYW4gYmlyIHllcmVsIGFyYXnDvHogYWRyZXNpXG4gICAqICAgNC4gxLBsayB1eWd1biAobG9vcGJhY2sgb2xtYXlhbikgSVB2NCBhcmF5w7x6IGFkcmVzaVxuICAgKiAgIDUuIFNvbiDDp2FyZSBvbGFyYWsgMTI3LjAuMC4xXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVQYXNzaXZlSXAoY2xpZW50U29ja2V0OiBuZXQuU29ja2V0KTogc3RyaW5nIHtcbiAgICAvLyAxLiBBw6fEsWsgeWFwxLFsYW5kxLFybWFcbiAgICBjb25zdCBjb25maWd1cmVkID0gdGhpcy5ub3JtYWxpemVJcCh0aGlzLnBhc3NpdmVJcCk7XG4gICAgaWYgKGNvbmZpZ3VyZWQgJiYgY29uZmlndXJlZCAhPT0gJzEyNy4wLjAuMScgJiYgY29uZmlndXJlZCAhPT0gJzAuMC4wLjAnICYmIGNvbmZpZ3VyZWQgIT09ICc6OjEnKSB7XG4gICAgICByZXR1cm4gY29uZmlndXJlZDtcbiAgICB9XG5cbiAgICAvLyAyLiBLb250cm9sIGJhxJ9sYW50xLFzxLFuxLFuIHllcmVsIGFkcmVzaSAoZW4gZ8O8dmVuaWxpcjogaXN0ZW1jaW5pbiBiYcSfbGFuZMSxxJ/EsSBJUClcbiAgICBjb25zdCBsb2NhbCA9IHRoaXMubm9ybWFsaXplSXAoY2xpZW50U29ja2V0Py5sb2NhbEFkZHJlc3MpO1xuICAgIGlmIChsb2NhbCAmJiBuZXQuaXNJUHY0KGxvY2FsKSAmJiBsb2NhbCAhPT0gJzEyNy4wLjAuMScgJiYgbG9jYWwgIT09ICcwLjAuMC4wJyAmJiBsb2NhbCAhPT0gJzo6MScpIHtcbiAgICAgIHJldHVybiBsb2NhbDtcbiAgICB9XG5cbiAgICAvLyAzLiBTb24gw6dhcmU6IHllcmVsIGJhxJ9sYW50xLEgKGxvY2FsaG9zdCkgdmV5YSB0ZXNwaXQgZWRpbGVtZXllbiBkdXJ1bS5cbiAgICAvLyDDh29rbHUgSVAnbGkgeWFwxLFsYXJkYSBvdG9tYXRpayBzZcOnaW0gaGF0YWzEsSBvbGFiaWxlY2XEn2luZGVuIGJ1cmFkYSB0YWhtaW5cbiAgICAvLyB5YXBtxLF5b3J1ejsga3VsbGFuxLFjxLEgZ2VyZWtpcnNlIHlhcMSxbGFuZMSxcm1hZGEgYHBhc3NpdmVJcGAgaWxlIGHDp8Sxa8OnYVxuICAgIC8vIGJlbGlydG1lbGlkaXIuXG4gICAgcmV0dXJuICcxMjcuMC4wLjEnO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1bnVjdW51biBkaW5sZWRpxJ9pL2FyYXnDvHogSVAnc2luaSBsb2dsYW1hayBpw6dpbiBzZcOnIChiaWxnaSBhbWHDp2zEsSkuXG4gICAqIDAuMC4wLjAnYSBiaW5kIGVkaWxkacSfaW5kZSBpbGsgdXlndW4gKGxvb3BiYWNrIG9sbWF5YW4pIElQdjQgYWRyZXNpIGt1bGxhbsSxbMSxci5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZUxpc3RlbklwKCk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlmYWNlcyA9IG9zLm5ldHdvcmtJbnRlcmZhY2VzKCkgYXMgYW55O1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGlmYWNlcykpIHtcbiAgICAgICAgY29uc3QgaWZhY2UgPSBpZmFjZXNbbmFtZV07XG4gICAgICAgIGlmICghaWZhY2UpIGNvbnRpbnVlO1xuICAgICAgICBmb3IgKGNvbnN0IGluZm8gb2YgaWZhY2UpIHtcbiAgICAgICAgICBjb25zdCBmYW1pbHkgPSB0eXBlb2YgaW5mby5mYW1pbHkgPT09ICdzdHJpbmcnID8gaW5mby5mYW1pbHkgOiAoaW5mby5mYW1pbHkgPT09IDQgPyAnSVB2NCcgOiAnSVB2NicpO1xuICAgICAgICAgIGlmIChmYW1pbHkgPT09ICdJUHY0JyAmJiAhaW5mby5pbnRlcm5hbCAmJiBpbmZvLmFkZHJlc3MgJiYgaW5mby5hZGRyZXNzICE9PSAnMC4wLjAuMCcgJiYgaW5mby5hZGRyZXNzICE9PSAnMTI3LjAuMC4xJykge1xuICAgICAgICAgICAgY29uc3QgaXAgPSB0aGlzLm5vcm1hbGl6ZUlwKGluZm8uYWRkcmVzcyk7XG4gICAgICAgICAgICBpZiAoaXAgJiYgbmV0LmlzSVB2NChpcCkpIHJldHVybiBpcDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB5b2tzYXlcbiAgICB9XG4gICAgcmV0dXJuICcxMjcuMC4wLjEnO1xuICB9XG5cbiAgLyoqXG4gICAqIFBBU1YgcG9ydCBhcmFsxLHEn8SxbmRhbiBzxLFyYXlsYSAoeXV2YXJsYWsgdXN1bCkgYmlyIHBvcnQgc2XDp1xuICAgKi9cbiAgcHJpdmF0ZSBuZXh0UGFzc2l2ZVBvcnQoKTogbnVtYmVyIHtcbiAgICBjb25zdCB7IG1pbiwgbWF4IH0gPSB0aGlzLnJ1bnRpbWUucGFzc2l2ZVBvcnRSYW5nZTtcbiAgICBjb25zdCBzcGFuID0gbWF4IC0gbWluICsgMTtcbiAgICBjb25zdCBwb3J0ID0gbWluICsgKHRoaXMucGFzc2l2ZVBvcnRDdXJzb3IgJSBzcGFuKTtcbiAgICB0aGlzLnBhc3NpdmVQb3J0Q3Vyc29yID0gKHRoaXMucGFzc2l2ZVBvcnRDdXJzb3IgKyAxKSAlIHNwYW47XG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICAvKipcbiAgICogUEFTViBwb3J0dW51IGRpbmxlbWV5ZSBhbCAoZGlubGV5aWNpIHphdGVuIG8gcG9ydHRheXNhIHllbmlkZW4ga3VydWxtYXopLlxuICAgKiAyMjcgeWFuxLF0xLEgYW5jYWsgcG9ydCBnZXLDp2VrdGVuIGRpbmxlZGlrdGVuIHNvbnJhIGfDtm5kZXJpbGlyLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVQYXNzaXZlTGlzdGVuZXIocG9ydDogbnVtYmVyKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIgJiYgdGhpcy5wYXNzaXZlRGF0YVNlcnZlci5saXN0ZW5pbmcgJiYgdGhpcy5wYXNzaXZlRGF0YVBvcnQgPT09IHBvcnQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEVza2kgZGlubGV5aWNpeWkga2FwYXQgKGthYnVsIGVkaWxtacWfIHZlcmkgYmHEn2xhbnTEsWxhcsSxIGV0a2lsZW5tZXopXG4gICAgaWYgKHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIpIHtcbiAgICAgIGNvbnN0IG9sZFNlcnZlciA9IHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXI7XG4gICAgICB0aGlzLnBhc3NpdmVEYXRhU2VydmVyID0gbnVsbDtcbiAgICAgIG9sZFNlcnZlci5jbG9zZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlciA9IG5ldC5jcmVhdGVTZXJ2ZXIoKGRhdGFTb2NrZXQpID0+IHtcbiAgICAgIGNvbnN0IG93bmVySWQgPSB0aGlzLnBhc3NpdmVDb25uSWQgfHwgJyc7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUGFzc2l2ZSBkYXRhIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWQ6IHBvcnQgJHtwb3J0fSAoJHtvd25lcklkfSlgKTtcbiAgICAgIHRoaXMuaGFuZGxlUGFzc2l2ZURhdGFDb25uZWN0aW9uKGRhdGFTb2NrZXQsIG93bmVySWQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXNvbHZlKSA9PiB7XG4gICAgICBzZXJ2ZXIub25jZSgnZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gUGFzc2l2ZSBwb3J0ICR7cG9ydH0gY2Fubm90IG9wZW46ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgICAgfSk7XG4gICAgICBzZXJ2ZXIubGlzdGVuKHsgcG9ydCwgaG9zdDogdGhpcy5zZXJ2ZXJJcCA/PyB1bmRlZmluZWQgfSwgKCkgPT4ge1xuICAgICAgICB0aGlzLnBhc3NpdmVEYXRhU2VydmVyID0gc2VydmVyO1xuICAgICAgICB0aGlzLnBhc3NpdmVEYXRhUG9ydCA9IHBvcnQ7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBQYXNzaXZlIGRhdGEgc2VydmVyIHN0YXJ0ZWQ6IHBvcnQgJHtwb3J0fWApO1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRlRQIHN1bnVjdXN1bnUgYmHFn2xhdFxuICAgKi9cbiAgcHVibGljIHN0YXJ0KCk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnNlcnZlciA9IG5ldC5jcmVhdGVTZXJ2ZXIoKHNvY2tldCkgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZUNvbm5lY3Rpb24oc29ja2V0KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBeWFybGFuYW4gSVAgdmFyc2EgbyBJUCd5aSBkaW5sZSwgeW9rc2EgdMO8bSBpbnRlcmZhY2VyaSAoMC4wLjAuMCkgZGlubGVcbiAgICAgIHRoaXMuc2VydmVyLmxpc3RlbihcbiAgICAgICAgeyBwb3J0OiB0aGlzLnJ1bnRpbWUucG9ydCwgaG9zdDogdGhpcy5zZXJ2ZXJJcCA/PyB1bmRlZmluZWQgfSxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBGVFAgc2VydmVyIHN0YXJ0ZWQ6IGZ0cDovLyR7dGhpcy5zZXJ2ZXJJcCA/PyB0aGlzLnJlc29sdmVMaXN0ZW5JcCgpfToke3RoaXMucnVudGltZS5wb3J0fWApO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTUUxpdGUgZGF0YWJhc2U6IGZ0cGQuZGJgKTtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29tbWFuZHM6IFVTRVIsIFBBU1MsIENXRCwgUFdELCBMSVNULCBSRVRSLCBTVE9SLCBERUxFLCBRVUlULCBOT09QYCk7XG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIHRoaXMuc2VydmVyLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTZXJ2ZXIgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zZXJ2ZXIub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRlRQIHNlcnZlciBjbG9zZWRgKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBEYXRhIHNlcnZlciBiYcWfbGF0XG4gICAgICB0aGlzLmRhdGFTZXJ2ZXIgPSBuZXQuY3JlYXRlU2VydmVyKChkYXRhU29ja2V0KSA9PiB7XG4gICAgICAgIHRoaXMuaGFuZGxlRGF0YUNvbm5lY3Rpb24oZGF0YVNvY2tldCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5kYXRhU2VydmVyLmxpc3Rlbih0aGlzLnJ1bnRpbWUuZGF0YVBvcnQsICgpID0+IHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIERhdGEgc2VydmVyIHN0YXJ0ZWQ6IHBvcnQgJHt0aGlzLnJ1bnRpbWUuZGF0YVBvcnR9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5kYXRhU2VydmVyLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ1tGdHBTZXJ2ZXJdIFN0YXJ0dXAgZXJyb3I6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBZZW5pIGJhxJ9sYW50xLF5xLEgacWfbGVcbiAgICovXG4gIHByaXZhdGUgaGFuZGxlQ29ubmVjdGlvbihzb2NrZXQ6IG5ldC5Tb2NrZXQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25uSWQgPSBgY29ubl8ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIE5ldyBjb25uZWN0aW9uOiAke2Nvbm5JZH0gKElQOiAke3NvY2tldC5yZW1vdGVBZGRyZXNzfSlgKTtcblxuICAgIC8vIE1ha3NpbXVtIGJhxJ9sYW50xLEga29udHJvbMO8XG4gICAgaWYgKHRoaXMuY29ubmVjdGlvbkNvdW50ID49IHRoaXMubWF4Q29ubmVjdGlvbnMpIHtcbiAgICAgIHNvY2tldD8ud3JpdGUoYDUwMyBTZXJ2aWNlIG5vdCBhdmFpbGFibGVcXHJcXG5gKTtcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbm5lY3Rpb25Db3VudCsrO1xuXG4gICAgY29uc3QgY29ubmVjdGlvbjogRnRwQ29ubmVjdGlvbiA9IHtcbiAgICAgIHNvY2tldCxcbiAgICAgIHVzZXI6IG51bGwsXG4gICAgICBwYXNzOiBudWxsLFxuICAgICAgaG9tZURpcjogJycsXG4gICAgICBjdXJyZW50RGlyOiAnJyxcbiAgICAgIHBlcm1pc3Npb25zOiB7fSxcbiAgICAgIHRyYW5zZmVyTW9kZTogbnVsbCxcbiAgICAgIHRyYW5zZmVyU2l6ZTogMCxcbiAgICAgIGxhc3RSZXBseTogMCxcbiAgICAgIGxhc3RNZXNzYWdlOiAnJyxcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0aW9ucy5zZXQoY29ubklkLCBjb25uZWN0aW9uKTtcblxuICAgIC8vIEJhxJ9sYW50xLEgYmHFn2xhdG1hIG1lc2FqxLFcbiAgICBzb2NrZXQ/LndyaXRlKGAyMjAgJHt0aGlzLnJ1bnRpbWUuYmFubmVyfVxcclxcbmApO1xuXG4gICAgLy8gQmHEn2xhbnTEsSBvbGF5bGFyxLFcbiAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICB0aGlzLmhhbmRsZUNvbnRyb2xEYXRhKGNvbm5JZCwgZGF0YSk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIGVycm9yICgke2Nvbm5JZH0pOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgdGhpcy5jbG9zZUNvbm5lY3Rpb24oY29ubklkLCAnZXJyb3InKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBjbG9zZWQ6ICR7Y29ubklkfWApO1xuICAgICAgdGhpcy5jbG9zZUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbigndGltZW91dCcsICgpID0+IHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIHRpbWVvdXQ6ICR7Y29ubklkfWApO1xuICAgICAgdGhpcy5jbG9zZUNvbm5lY3Rpb24oY29ubklkLCAndGltZW91dCcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW5hIGdlbGVuIHZlcml5aSBzYXTEsXIgc2F0xLFyIGF5csSxxZ90xLFyLlxuICAgKiBUZWsgcGFrZXR0ZSBiaXJkZW4gw6dvayBrb211dCBnZWxlYmlsaXIsIHlhcsSxbSBrYWxhbiBzYXTEsXIgc29ucmFraSBwYWtldHRlIHRhbWFtbGFuxLFyLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVDb250cm9sRGF0YShjb25uSWQ6IHN0cmluZywgZGF0YTogQnVmZmVyKTogdm9pZCB7XG4gICAgY29uc3QgYnVmZmVyID0gKHRoaXMuaW5wdXRCdWZmZXJzLmdldChjb25uSWQpIHx8ICcnKSArIGRhdGEudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QgbGluZXMgPSBidWZmZXIuc3BsaXQoL1xcclxcbnxcXG58XFxyLyk7XG4gICAgLy8gU29uIHBhcsOnYSB5YXLEsW0gc2F0xLFyIG9sYWJpbGlyOiBiaXIgc29ucmFraSBwYWtldGUga2FkYXIgc2FrbGFcbiAgICB0aGlzLmlucHV0QnVmZmVycy5zZXQoY29ubklkLCBsaW5lcy5wb3AoKSA/PyAnJyk7XG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIHRoaXMuZW5xdWV1ZUNvbW1hbmQoY29ubklkLCBsaW5lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogS29tdXRsYXLEsSBiYcSfbGFudMSxIGJhxZ/EsW5hIHPEsXJheWxhIGnFn2xlIChhc3luYyBrb211dGxhciBzxLFyYXnEsSBib3ptYXPEsW4pXG4gICAqL1xuICBwcml2YXRlIGVucXVldWVDb21tYW5kKGNvbm5JZDogc3RyaW5nLCBsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMuY29tbWFuZFF1ZXVlcy5nZXQoY29ubklkKSB8fCBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBjb25zdCBuZXh0ID0gcHJldmlvdXNcbiAgICAgIC50aGVuKCgpID0+IHRoaXMucHJvY2Vzc0NvbW1hbmQoY29ubklkLCBsaW5lKSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIENvbW1hbmQgcHJvY2Vzc2luZyBmYWlsZWQgKCR7Y29ubklkfSk6YCwgZXJyKSk7XG4gICAgdGhpcy5jb21tYW5kUXVldWVzLnNldChjb25uSWQsIG5leHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlayBiaXIga29tdXQgc2F0xLFyxLFuxLEgacWfbGVcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcHJvY2Vzc0NvbW1hbmQoY29ubklkOiBzdHJpbmcsIHJhd0xpbmU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICAgIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgICAgIGlmICghY29ubikge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gbm90IGZvdW5kOiAke2Nvbm5JZH1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsaW5lID0gcmF3TGluZS50cmltKCk7XG4gICAgICBpZiAobGluZSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBLb211dHUgaWxrIGJvxZ9sdWt0YW4gYsO2bDogZG9zeWEvIGRpemluIGFkbGFyxLFuZGFraSBib8WfbHVrbGFyIGtvcnVudXJcbiAgICAgIGNvbnN0IHNlcGFyYXRvckluZGV4ID0gbGluZS5zZWFyY2goL1xccy8pO1xuICAgICAgY29uc3QgY29tbWFuZCA9IChzZXBhcmF0b3JJbmRleCA9PT0gLTEgPyBsaW5lIDogbGluZS5zbGljZSgwLCBzZXBhcmF0b3JJbmRleCkpLnRvVXBwZXJDYXNlKCk7XG4gICAgICBjb25zdCBhcmdzID0gc2VwYXJhdG9ySW5kZXggPT09IC0xID8gJycgOiBsaW5lLnNsaWNlKHNlcGFyYXRvckluZGV4KS50cmltKCk7XG5cbiAgICAgIGlmIChjb21tYW5kID09PSAnVVNFUicpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlVXNlcihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1BBU1MnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVBhc3MoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdRVUlUJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVRdWl0KGNvbm5JZCwgY29ubiwgKGlkLCByZWFzb24pID0+IHRoaXMuY2xvc2VDb25uZWN0aW9uKGlkLCByZWFzb24pKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ05PT1AnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZU5vb3AoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1BXRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUHdkKGNvbm5JZCwgY29ubik7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdDV0QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZUN3ZChjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0xJU1QnIHx8IGNvbW1hbmQgPT09ICdOTFNUJykge1xuICAgICAgICBjb25zdCBsaXN0UmVzdWx0ID0gYXdhaXQgQ29tbWFuZHMuaGFuZGxlTGlzdChjb25uSWQsIGNvbm4sIHRoaXMudXNlck1hbmFnZXIhLCBzb2NrZXQpO1xuICAgICAgICBjb25zdCByZXN1bHRPYmogPSBsaXN0UmVzdWx0IGFzIGFueTtcbiAgICAgICAgaWYgKHJlc3VsdE9iaiAmJiByZXN1bHRPYmouZGF0YSAmJiB0eXBlb2YgcmVzdWx0T2JqLmRhdGEgPT09ICdvYmplY3QnICYmIHJlc3VsdE9iai5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgbGlzdERhdGEgPSByZXN1bHRPYmouZGF0YSBhcyB7IG91dHB1dDogc3RyaW5nLCBkaXJlY3Rvcnk6IHN0cmluZyB9O1xuICAgICAgICAgIHRoaXMucGVuZGluZ0xpc3REYXRhID0gbGlzdERhdGEub3V0cHV0O1xuICAgICAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIExJU1QgZGF0YSB3YWl0aW5nOiAke2xpc3REYXRhLm91dHB1dCA/IGxpc3REYXRhLm91dHB1dC5sZW5ndGggOiAwfSBieXRlc2ApO1xuICAgICAgICAgIHRoaXMuZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUkVUUicpIHtcbiAgICAgICAgY29uc3QgcmV0clJlc3VsdCA9IGF3YWl0IENvbW1hbmRzLmhhbmRsZVJldHIoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISwgc29ja2V0KTtcbiAgICAgICAgY29uc3QgcmVzdWx0T2JqID0gcmV0clJlc3VsdCBhcyBhbnk7XG4gICAgICAgIGlmIChyZXN1bHRPYmogJiYgcmVzdWx0T2JqLmRhdGEgJiYgdHlwZW9mIHJlc3VsdE9iai5kYXRhID09PSAnb2JqZWN0JyAmJiByZXN1bHRPYmouZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHJldHJEYXRhID0gcmVzdWx0T2JqLmRhdGEgYXMgeyBmaWxlUGF0aDogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nUmV0ckZpbGUgPSByZXRyRGF0YS5maWxlUGF0aDtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdSZXRyQ29ubklkID0gY29ubklkO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBSRVRSIGZpbGUgd2FpdGluZzogJHtyZXRyRGF0YS5maWxlUGF0aH1gKTtcbiAgICAgICAgICB0aGlzLmVuc3VyZURhdGFDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1NUT1InKSB7XG4gICAgICAgIGNvbnN0IHN0b3JSZXN1bHQgPSBhd2FpdCBDb21tYW5kcy5oYW5kbGVTdG9yKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEsIHNvY2tldCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdE9iaiA9IHN0b3JSZXN1bHQgYXMgYW55O1xuICAgICAgICBpZiAocmVzdWx0T2JqICYmIHJlc3VsdE9iai5kYXRhICYmIHR5cGVvZiByZXN1bHRPYmouZGF0YSA9PT0gJ29iamVjdCcgJiYgcmVzdWx0T2JqLmRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBzdG9yRGF0YSA9IHJlc3VsdE9iai5kYXRhIGFzIHsgZmlsZVBhdGg6IHN0cmluZyB9O1xuICAgICAgICAgIHRoaXMucGVuZGluZ1N0b3JGaWxlID0gc3RvckRhdGEuZmlsZVBhdGg7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IGNvbm5JZDtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUiBmaWxlIHdhaXRpbmc6ICR7c3RvckRhdGEuZmlsZVBhdGh9YCk7XG4gICAgICAgICAgdGhpcy5lbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdERUxFJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVEZWxlKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUEFTVicpIHtcbiAgICAgICAgLy8gUGFzaWYgbW9kOiBkYXRhIGJhxJ9sYW50xLFzxLFuxLFuIHNhaGliaSBidSBrb211dHUgdmVyZW4gYmHEn2xhbnTEsWTEsXJcbiAgICAgICAgdGhpcy5wYXNzaXZlQ29ubklkID0gY29ubklkO1xuICAgICAgICB0aGlzLmNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQpO1xuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSBmYWxzZTtcblxuICAgICAgICAvLyBZYXDEsWxhbmTEsXLEsWxhbiBhcmFsxLFrdGFuIHBvcnQgc2XDpyB2ZSBkaW5sZW1leWUgYWxcbiAgICAgICAgY29uc3QgcG9ydCA9IHRoaXMubmV4dFBhc3NpdmVQb3J0KCk7XG4gICAgICAgIGNvbnN0IGxpc3RlbmluZyA9IGF3YWl0IHRoaXMuZW5zdXJlUGFzc2l2ZUxpc3RlbmVyKHBvcnQpO1xuICAgICAgICBpZiAobGlzdGVuaW5nKSB7XG4gICAgICAgICAgY29uc3QgZWZmZWN0aXZlUGFzc2l2ZUlwID0gdGhpcy5yZXNvbHZlUGFzc2l2ZUlwKGNvbm4uc29ja2V0KTtcbiAgICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQYXN2KGNvbm5JZCwgY29ubiwgZWZmZWN0aXZlUGFzc2l2ZUlwLCBwb3J0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzb2NrZXQ/LndyaXRlKGA0MjUgQ2Fubm90IG9wZW4gZGF0YSBjb25uZWN0aW9uXFxyXFxuYCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1BPUlQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVBvcnQoY29ubiwgYXJncyk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdGRUFUJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVGZWF0KGNvbm5JZCwgY29ubik7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdTWVNUJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVTeXN0KGNvbm5JZCwgY29ubik7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdUWVBFJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVUeXBlKGNvbm4sIGFyZ3MpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnTUtEJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVNa2QoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdSTUQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVJtZChjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JORlInKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVJuZnIoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdSTlRPJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVSbnRvKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQmlsaW5tZXllbiBrb211dFxuICAgICAgICBzb2NrZXQ/LndyaXRlKGA1MDIgQ29tbWFuZCBub3QgaW1wbGVtZW50ZWQ6ICR7Y29tbWFuZH1cXHJcXG5gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIHByb2Nlc3NpbmcgZXJyb3IgKCR7Y29ubklkfSk6YCwgZXJyb3IpO1xuICAgICAgY29uc3QgY29ubiA9IHRoaXMuY29ubmVjdGlvbnMuZ2V0KGNvbm5JZCk7XG4gICAgICBjb25zdCBzb2NrZXQgPSBjb25uPy5zb2NrZXQ7XG4gICAgICBzb2NrZXQ/LndyaXRlKGA1MDAgSW50ZXJuYWwgc2VydmVyIGVycm9yXFxyXFxuYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsW7EsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVEYXRhQ29ubmVjdGlvbihzb2NrZXQ6IG5ldC5Tb2NrZXQpOiB2b2lkIHtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIGVzdGFibGlzaGVkYCk7XG4gICAgLy8gRGF0YSBjb25uZWN0aW9uIGnDp2luIGnFn2xlbWxlclxuICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgIC8vIERhdGEgdHJhbnNmZXIgacWfbGVtbGVyaVxuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gY2xvc2VkYCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGF0YSBiYcSfbGFudMSxc8SxbsSxIChQQVNWL1BPUlQpIGthYnVsIGV0IHZlIGJla2xleWVuIGFrdGFyxLFtxLEgYmHEn2xhLlxuICAgKiBWZXJpIGFrdGFyxLFtxLEga29tdXQgKExJU1QvUkVUUi9TVE9SKSBnZWxkacSfaW5kZSBiYcWfbGFyOyBpc3RlbWNpIHZlcmlcbiAgICogYmHEn2xhbnTEsXPEsW7EsSBrb211dHRhbiDDtm5jZSBhw6d0xLHEn8SxbmRhIGJhxJ9sYW50xLEgYmVrbGV0aWxpci5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlUGFzc2l2ZURhdGFDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCwgY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUGFzc2l2ZSBkYXRhIGNvbm5lY3Rpb24gYWNjZXB0ZWQ6ICR7Y29ubklkfSAocmVtb3RlIHBvcnQgJHtzb2NrZXQucmVtb3RlUG9ydH0pYCk7XG4gICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gZmFsc2U7XG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIGVycm9yOiAke2Vyci5tZXNzYWdlfSAocmVtb3RlIHBvcnQgJHtzb2NrZXQucmVtb3RlUG9ydH0pYCk7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9PT0gc29ja2V0KSB7XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSA9IHRydWU7XG4gICAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuICAgICAgfVxuICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignY2xvc2UnLCAoaGFkRXJyb3IpID0+IHtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBeW7EsSBhbmRhIHlhbG7EsXpjYSBiaXIgZGF0YSBiYcSfbGFudMSxc8SxIGt1bGxhbsSxbMSxclxuICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgIT09IHNvY2tldCAmJiAhdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveSgpO1xuICAgIH1cbiAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gc29ja2V0O1xuICAgICAgTG9nZ2VyLmRlYnVnKGBbRnRwU2VydmVyXSBwZW5kaW5nRGF0YVNvY2tldCBhc3NpZ25lZCAocmVtb3RlIHBvcnQgJHtzb2NrZXQucmVtb3RlUG9ydH0pYCk7XG4gICAgdGhpcy50cnlTZXJ2ZURhdGEoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMSVNUL1JFVFIvU1RPUiBpw6dpbiB2ZXJpIGJhxJ9sYW50xLFzxLFuxLEgaGF6xLFybGE6XG4gICAqIHBhc2lmIG1vZGRhIGlzdGVtY2luaW4gYmHEn2xhbm1hc8SxIGJla2xlbmlyLCBha3RpZiBtb2RkYSAoUE9SVCkgc3VudWN1IGJhxJ9sYW7EsXIuXG4gICAqL1xuICBwcml2YXRlIGVuc3VyZURhdGFDb25uZWN0aW9uKGNvbm5JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgLy8gMTUwJ2RlbiBzb25yYSBpc3RlbWNpZGUgc29uc3V6IGJla2xlbWUgb2xtYXPEsW46IGVuIGZheiBEQVRBX1dBSVRfVElNRU9VVF9NUyBiZWtsZVxuICAgIHRoaXMuYXJtRGF0YVdhaXRUaW1lb3V0KGNvbm5JZCk7XG4gICAgTG9nZ2VyLmRlYnVnKGBbRnRwU2VydmVyXSBlbnN1cmVEYXRhQ29ubmVjdGlvbigke2Nvbm5JZH0pOiBwZW5kaW5nIHNvY2tldCAke3RoaXMucGVuZGluZ0RhdGFTb2NrZXQgPyBgZXhpc3RzIChyZW1vdGUgcG9ydCAke3RoaXMucGVuZGluZ0RhdGFTb2NrZXQucmVtb3RlUG9ydH0sIGRlc3Ryb3llZD0ke3RoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveWVkfSlgIDogJ25vbmUnfWApO1xuICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgdGhpcy50cnlTZXJ2ZURhdGEoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoIWNvbm4gfHwgY29ubi5kYXRhTW9kZSAhPT0gJ2FjdGl2ZScgfHwgIWNvbm4uYWN0aXZlRGF0YVRhcmdldCkge1xuICAgICAgLy8gUGFzaWYgbW9kOiBpc3RlbWNpbmluIGJhZ2xhbm1hc2kgYmVrbGVuaXJcbiAgICAgIGlmIChcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ICYmXG4gICAgICAgIHRoaXMucGVuZGluZ1N0b3JGaWxlICE9PSBudWxsICYmXG4gICAgICAgIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPT09IGNvbm5JZFxuICAgICAgKSB7XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSA9IGZhbHNlO1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5wZW5kaW5nU3RvckZpbGU7XG4gICAgICAgIHRoaXMucGVuZGluZ1N0b3JGaWxlID0gbnVsbDtcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgICAgIHRoaXMuY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBwYXRoTW9kID0gcmVxdWlyZSgncGF0aCcpO1xuICAgICAgICAgIGNvbnN0IGZzTW9kID0gcmVxdWlyZSgnZnMnKTtcbiAgICAgICAgICBmc01vZC5ta2RpclN5bmMocGF0aE1vZC5kaXJuYW1lKGZpbGUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICBmc01vZC53cml0ZUZpbGVTeW5jKGZpbGUsICcnKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFNUT1IgZWFybHkgY2xvc2UgZmlsZSBlcnJvcjogJHsoZSBhcyBFcnJvcikubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIDIyNiwgJ1N0b3IgY29tcGxldGUnKTtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFNUT1IgY29tcGxldGVkIHZpYSBlYXJseSBjbG9zZTogJHtmaWxlfWApO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IGNvbm4uYWN0aXZlRGF0YVRhcmdldDtcbiAgICBjb25zdCBzb2NrZXQgPSBuZXQuY3JlYXRlQ29ubmVjdGlvbih0YXJnZXQucG9ydCwgdGFyZ2V0LmlwLCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBBY3RpdmUgZGF0YSBjb25uZWN0aW9uIGVzdGFibGlzaGVkOiAke3RhcmdldC5pcH06JHt0YXJnZXQucG9ydH1gKTtcbiAgICAgIHRoaXMuaGFuZGxlUGFzc2l2ZURhdGFDb25uZWN0aW9uKHNvY2tldCwgY29ubklkKTtcbiAgICB9KTtcbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIEFjdGl2ZSBkYXRhIGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9PT0gc29ja2V0KSB7XG4gICAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuICAgICAgfVxuICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCZWtsZXllbiBMSVNUL1JFVFIvU1RPUiBha3RhcsSxbcSxbsSxLCB2ZXJpIGJhxJ9sYW50xLFzxLEgaGF6xLFyc2EgYmHFn2xhdC5cbiAgICogMjI2IHlhbsSxdMSxbsSxIHZlcmkgZ2Vyw6dla3RlbiBnw7ZuZGVyaWxkaWt0ZW4gLyBhbMSxbmTEsWt0YW4gc29ucmEgZ8O2bmRlci5cbiAgICovXG4gIHByaXZhdGUgdHJ5U2VydmVEYXRhKCk6IHZvaWQge1xuICAgIGNvbnN0IHNvY2tldCA9IHRoaXMucGVuZGluZ0RhdGFTb2NrZXQ7XG4gICAgaWYgKCFzb2NrZXQgfHwgc29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgTG9nZ2VyLmRlYnVnKGBbRnRwU2VydmVyXSB0cnlTZXJ2ZURhdGEgc2tpcHBlZDogc29ja2V0ICR7c29ja2V0ID8gYGRlc3Ryb3llZCAocmVtb3RlIHBvcnQgJHtzb2NrZXQucmVtb3RlUG9ydH0pYCA6ICdub25lJ30sIHBlbmRpbmcgTElTVD0ke3RoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGx9IFJFVFI9JHt0aGlzLnBlbmRpbmdSZXRyQ29ubklkICE9PSBudWxsfSBTVE9SPSR7dGhpcy5wZW5kaW5nU3RvckNvbm5JZCAhPT0gbnVsbH1gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBMSVNUIC8gTkxTVFxuICAgIGlmICh0aGlzLnBlbmRpbmdMaXN0RGF0YSAhPT0gbnVsbCAmJiB0aGlzLnBlbmRpbmdMaXN0Q29ubklkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBkYXRhID0gdGhpcy5wZW5kaW5nTGlzdERhdGE7XG4gICAgICBjb25zdCBjb25uSWQgPSB0aGlzLnBlbmRpbmdMaXN0Q29ubklkO1xuICAgICAgdGhpcy5wZW5kaW5nTGlzdERhdGEgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcblxuICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIExJU1QgZGF0YSBzZW5kaW5nOiAke2RhdGEubGVuZ3RofSBieXRlc2ApO1xuICAgICAgc29ja2V0Lm9uY2UoJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuTElTVF9FTkQsICdEaXJlY3RvcnkgbGlzdGluZyBjb21wbGV0ZScpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQud3JpdGUoZGF0YSwgKCkgPT4gc29ja2V0LmVuZCgpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSRVRSXG4gICAgaWYgKHRoaXMucGVuZGluZ1JldHJGaWxlICE9PSBudWxsICYmIHRoaXMucGVuZGluZ1JldHJDb25uSWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBlbmRpbmdSZXRyRmlsZTtcbiAgICAgIGNvbnN0IGNvbm5JZCA9IHRoaXMucGVuZGluZ1JldHJDb25uSWQ7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyQ29ubklkID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUkVUUiBmaWxlIHNlbmRpbmc6ICR7ZmlsZX1gKTtcbiAgICAgIGNvbnN0IHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGUpO1xuICAgICAgcmVhZFN0cmVhbS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gUkVUUiByZWFkIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5GSUxFX05PVF9GT1VORCwgJ0Nhbm5vdCByZWFkIGZpbGUnKTtcbiAgICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0Lm9uY2UoJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuUkVUUl9PSywgJ1JldHIgY29tcGxldGUnKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZFN0cmVhbS5waXBlKHNvY2tldCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU1RPUlxuICAgIGlmICh0aGlzLnBlbmRpbmdTdG9yRmlsZSAhPT0gbnVsbCAmJiB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5wZW5kaW5nU3RvckZpbGU7XG4gICAgICBjb25zdCBjb25uSWQgPSB0aGlzLnBlbmRpbmdTdG9yQ29ubklkO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcblxuICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFNUT1IgZmlsZSByZWNlaXZpbmc6ICR7ZmlsZX1gKTtcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSk7XG4gICAgICB3cml0ZVN0cmVhbS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gU1RPUiB3cml0ZSBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuSU5URVJOQUxfRVJSLCAnQ2Fubm90IHdyaXRlIGZpbGUnKTtcbiAgICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICAgIH0pO1xuICAgICAgd3JpdGVTdHJlYW0ub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuU1RPUl9PSywgJ1N0b3IgY29tcGxldGUnKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0LnBpcGUod3JpdGVTdHJlYW0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEhlbsO8eiBiZWtsZXllbiBha3RhcsSxbSB5b2s6IGJhxJ9sYW50xLEgYmlyIHNvbnJha2kga29tdXQgacOnaW4gYcOnxLFrIHR1dHVsdXJcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpIGJhxJ9sYW50xLFzxLEgYmVrbGVtZSB6YW1hbmxhecSxY8Sxc8SxbsSxIGJhxZ9sYXQgKGlraW5jaSBrZXogYmHFn2xhdMSxbG1heilcbiAgICovXG4gIHByaXZhdGUgYXJtRGF0YVdhaXRUaW1lb3V0KGNvbm5JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGF0YVdhaXRUaW1lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRhdGFXYWl0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuZGF0YVdhaXRUaW1lciA9IG51bGw7XG4gICAgICBpZiAodGhpcy5wZW5kaW5nRGF0YVNvY2tldCAmJiAhdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgICAgcmV0dXJuOyAvLyB2ZXJpIGJhxJ9sYW50xLFzxLEgaGF6xLFyLCBzb3J1biB5b2tcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBlbmRpbmcgPVxuICAgICAgICB0aGlzLnBlbmRpbmdMaXN0Q29ubklkICE9PSBudWxsIHx8IHRoaXMucGVuZGluZ1JldHJDb25uSWQgIT09IG51bGwgfHwgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCAhPT0gbnVsbDtcbiAgICAgIGlmICghcGVuZGluZyB8fCB0aGlzLnBlbmRpbmdMaXN0Q29ubklkICE9PSBjb25uSWQgJiYgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gY29ubklkICYmIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgIT09IGNvbm5JZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBMb2dnZXIud2FybihgW0Z0cFNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIHRpbWVvdXQ6ICR7Y29ubklkfSAobm8gY29ubmVjdGlvbiBhZnRlciAxNTApYCk7XG4gICAgICB0aGlzLmNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQpO1xuICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuVFJBTlNGRVJfQUJPUlRFRCwgJ1RyYW5zZmVyIGFib3J0ZWQ6IGRhdGEgY29ubmVjdGlvbiB0aW1lb3V0Jyk7XG4gICAgfSwgRnRwU2VydmVyLkRBVEFfV0FJVF9USU1FT1VUX01TKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpIGJhxJ9sYW50xLFzxLEgYmVrbGVtZSB6YW1hbmxhecSxY8Sxc8SxbsSxIGlwdGFsIGV0XG4gICAqL1xuICBwcml2YXRlIGNsZWFyRGF0YVdhaXRUaW1lb3V0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRhdGFXYWl0VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRhdGFXYWl0VGltZXIpO1xuICAgICAgdGhpcy5kYXRhV2FpdFRpbWVyID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQmHEn2xhbnTEsW7EsW4gYmVrbGV5ZW4gYWt0YXLEsW3EsW7EsSB0ZW1pemxlICh5ZW5pIFBBU1YgZ2VsaW5jZSBlc2tpc2kgZ2XDp2Vyc2l6IG9sdXIpXG4gICAqL1xuICBwcml2YXRlIGNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTtcbiAgICBpZiAodGhpcy5wZW5kaW5nTGlzdENvbm5JZCA9PT0gY29ubklkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0RGF0YSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0Q29ubklkID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMucGVuZGluZ1JldHJDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wZW5kaW5nUmV0ckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9IG51bGw7XG4gICAgfVxuICAgIGlmICh0aGlzLnBlbmRpbmdTdG9yQ29ubklkID09PSBjb25uSWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ1N0b3JGaWxlID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBLb250cm9sIGJhxJ9sYW50xLFzxLFuYSB5YW7EsXQgZ8O2bmRlclxuICAgKi9cbiAgcHJpdmF0ZSB3cml0ZUNvbnRyb2woY29ubklkOiBzdHJpbmcsIGNvZGU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgY29ubiA9IHRoaXMuY29ubmVjdGlvbnMuZ2V0KGNvbm5JZCk7XG4gICAgaWYgKGNvbm4gJiYgY29ubi5zb2NrZXQpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gY29kZTtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgY29ubi5zb2NrZXQud3JpdGUoYCR7Y29kZX0gJHttZXNzYWdlfWAgKyAnXFxyXFxuJyk7XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBCYcSfbGFudMSxecSxIGthcGF0XG4gICAqL1xuICBwdWJsaWMgY2xvc2VDb25uZWN0aW9uKGNvbm5JZDogc3RyaW5nLCByZWFzb24/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICAvLyBCYcSfbGFudMSxeWEgYWl0IHRhbXBvbiwga3V5cnVrIHZlIGJla2xleWVuIGFrdGFyxLFtIGthecSxdGxhcsSxbsSxIHRlbWl6bGVcbiAgICB0aGlzLmlucHV0QnVmZmVycy5kZWxldGUoY29ubklkKTtcbiAgICB0aGlzLmNvbW1hbmRRdWV1ZXMuZGVsZXRlKGNvbm5JZCk7XG4gICAgdGhpcy5jbGVhclBlbmRpbmdUcmFuc2ZlcnMoY29ubklkKTtcbiAgICBpZiAodGhpcy5wYXNzaXZlQ29ubklkID09PSBjb25uSWQpIHtcbiAgICAgIHRoaXMucGFzc2l2ZUNvbm5JZCA9IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY29ubiA9IHRoaXMuY29ubmVjdGlvbnMuZ2V0KGNvbm5JZCk7XG4gICAgaWYgKGNvbm4pIHtcbiAgICAgIGNvbm4uc29ja2V0Py5lbmQoKTtcbiAgICAgIHRoaXMuY29ubmVjdGlvbnMuZGVsZXRlKGNvbm5JZCk7XG4gICAgICB0aGlzLmNvbm5lY3Rpb25Db3VudC0tO1xuICAgICAgaWYgKHJlYXNvbikge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gY2xvc2VkOiAke2Nvbm5JZH0gKHJlYXNvbjogJHtyZWFzb259KWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIGNsb3NlZDogJHtjb25uSWR9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=