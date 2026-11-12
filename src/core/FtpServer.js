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
exports.FtpServer = exports.SUPPORTED_COMMANDS = exports.SETTING_KEYS = void 0;
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
exports.SETTING_KEYS = {
    port: 'ftp.port',
    dataPort: 'ftp.dataPort',
    maxConnections: 'ftp.maxConnections',
    logLevel: 'ftp.logLevel',
    banner: 'ftp.banner',
    passivePortRange: 'ftp.passivePortRange',
    passiveIp: 'ftp.passiveIp',
    ip: 'ftp.ip',
};
exports.SUPPORTED_COMMANDS = 'USER, PASS, CWD, PWD, LIST, RETR, STOR, DELE, QUIT, NOOP';
class FtpServer {
    constructor(config = {}) {
        this.server = null;
        this.dataServer = null;
        this.connections = new Map();
        this.dataConnections = new Map();
        this.userManager = null;
        this.connectionCount = 0;
        this.activeOperations = 0;
        this.activeTransfers = 0;
        this.idleFlushHandle = null;
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
        logger_1.Logger.setSink((records) => {
            this.db.insertLogs(records);
        });
        logger_1.Logger.setBusyCheck(() => this.isBusy());
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
        for (const [configKey, settingKey] of Object.entries(exports.SETTING_KEYS)) {
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
        const settingKey = exports.SETTING_KEYS[key];
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
    getRuntimeConfig() {
        return { ...this.runtime };
    }
    clearSetting(key) {
        const settingKey = exports.SETTING_KEYS[key];
        if (!settingKey)
            return false;
        return this.db.deleteSetting(settingKey);
    }
    getConnectionCount() {
        return this.connections.size;
    }
    isBusy() {
        if (this.activeOperations > 0)
            return true;
        if (this.activeTransfers > 0)
            return true;
        if (this.dataWaitTimer !== null)
            return true;
        if (this.pendingListConnId !== null || this.pendingRetrConnId !== null || this.pendingStorConnId !== null) {
            return true;
        }
        return false;
    }
    scheduleIdleFlush() {
        if (this.idleFlushHandle !== null)
            return;
        this.idleFlushHandle = setImmediate(() => {
            this.idleFlushHandle = null;
            if (!this.isBusy())
                logger_1.Logger.flushLogs();
        });
        this.idleFlushHandle.unref?.();
    }
    finishTransfer() {
        if (this.activeTransfers > 0)
            this.activeTransfers -= 1;
        this.scheduleIdleFlush();
    }
    isListening() {
        return this.server !== null && this.server.listening;
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
    start(onReady) {
        let pending = onReady ? 2 : 0;
        let readyFired = false;
        const done = () => {
            if (!onReady || readyFired)
                return;
            pending -= 1;
            if (pending <= 0) {
                readyFired = true;
                onReady();
            }
        };
        try {
            this.server = net.createServer((socket) => {
                this.handleConnection(socket);
            });
            this.server.listen({ port: this.runtime.port, host: this.serverIp ?? undefined }, () => {
                logger_1.Logger.info(`[FtpServer] FTP server started: ftp://${this.serverIp ?? this.resolveListenIp()}:${this.runtime.port}`);
                logger_1.Logger.info(`[FtpServer] SQLite database: ${this.runtime.dbPath ?? 'ftpd.db'}`);
                logger_1.Logger.info(`[FtpServer] Commands: ${exports.SUPPORTED_COMMANDS}`);
                done();
            });
            this.server.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Server error: ${err.message}`);
                done();
            });
            this.server.on('close', () => {
                logger_1.Logger.info(`[FtpServer] FTP server closed`);
            });
            this.dataServer = net.createServer((dataSocket) => {
                this.handleDataConnection(dataSocket);
            });
            this.dataServer.listen(this.runtime.dataPort, () => {
                logger_1.Logger.info(`[FtpServer] Data server started: port ${this.runtime.dataPort}`);
                done();
            });
            this.dataServer.on('error', (err) => {
                logger_1.Logger.error(`[FtpServer] Data server error: ${err.message}`);
                done();
            });
        }
        catch (error) {
            logger_1.Logger.error('[FtpServer] Startup error:', error);
            done();
        }
    }
    getListenAddress() {
        const host = this.serverIp ?? this.resolveListenIp();
        return `${host}:${this.runtime.port}`;
    }
    stop() {
        if (this.dataWaitTimer) {
            clearTimeout(this.dataWaitTimer);
            this.dataWaitTimer = null;
        }
        for (const [connId, conn] of [...this.connections]) {
            try {
                conn.socket?.destroy();
            }
            catch {
            }
            this.connections.delete(connId);
        }
        this.connectionCount = 0;
        this.inputBuffers.clear();
        this.commandQueues.clear();
        if (this.pendingDataSocket && !this.pendingDataSocket.destroyed) {
            try {
                this.pendingDataSocket.destroy();
            }
            catch {
            }
        }
        this.pendingDataSocket = null;
        const closeQuietly = (srv) => {
            if (!srv)
                return;
            try {
                srv.close();
            }
            catch {
            }
        };
        closeQuietly(this.server);
        closeQuietly(this.dataServer);
        closeQuietly(this.passiveDataServer);
        this.server = null;
        this.dataServer = null;
        this.passiveDataServer = null;
        logger_1.Logger.info('[FtpServer] FTP server stopped');
        logger_1.Logger.flushLogs(true);
        try {
            this.db.close();
        }
        catch {
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
        this.activeOperations += 1;
        const next = previous
            .then(() => this.processCommand(connId, line))
            .catch((err) => logger_1.Logger.error(`[FtpServer] Command processing failed (${connId}):`, err))
            .finally(() => {
            this.activeOperations -= 1;
            this.scheduleIdleFlush();
        });
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
            this.scheduleIdleFlush();
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
            this.activeTransfers += 1;
            socket.once('close', () => this.finishTransfer());
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
            this.activeTransfers += 1;
            socket.once('close', () => this.finishTransfer());
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
            this.activeTransfers += 1;
            socket.once('close', () => this.finishTransfer());
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
        this.scheduleIdleFlush();
    }
}
exports.FtpServer = FtpServer;
FtpServer.DATA_WAIT_TIMEOUT_MS = 15000;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnRwU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvRnRwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLEdBQUcsZ0NBQVk7QUFDM0IsTUFBWSxFQUFFLCtCQUFXO0FBRXpCLG9DQUFpRjtBQUNqRixnREFBNkM7QUFDN0MsNkNBQWlEO0FBRWpELDRDQUFtRDtBQUNuRCxNQUFZLFFBQVEsd0NBQW9CO0FBc0J4QyxNQUFNLGNBQWMsR0FBeUI7SUFDM0MsSUFBSSxFQUFFLEVBQUU7SUFDUixRQUFRLEVBQUUsRUFBRTtJQUNaLGNBQWMsRUFBRSxHQUFHO0lBQ25CLFFBQVEsRUFBRSxNQUFNO0lBRWhCLE1BQU0sRUFBRSxFQUFFO0lBRVYsZ0JBQWdCLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7SUFDNUMsTUFBTSxFQUFFLFdBQVc7Q0FDcEIsQ0FBQztBQUlXLFFBQUEsWUFBWSxHQUEyQjtJQUNsRCxJQUFJLEVBQUUsVUFBVTtJQUNoQixRQUFRLEVBQUUsY0FBYztJQUN4QixjQUFjLEVBQUUsb0JBQW9CO0lBQ3BDLFFBQVEsRUFBRSxjQUFjO0lBQ3hCLE1BQU0sRUFBRSxZQUFZO0lBQ3BCLGdCQUFnQixFQUFFLHNCQUFzQjtJQUN4QyxTQUFTLEVBQUUsZUFBZTtJQUMxQixFQUFFLEVBQUUsUUFBUTtDQUNiLENBQUM7QUFlVyxRQUFBLGtCQUFrQixHQUFHLDBEQUEwRCxDQUFDO0FBSzdGO0lBNENFLFlBQVksTUFBTSxHQUEwQixFQUFFO1FBM0N0QyxXQUFNLEdBQXNCLElBQUksQ0FBQztRQUNqQyxlQUFVLEdBQXNCLElBQUksQ0FBQztRQUNyQyxnQkFBVyxHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3BELG9CQUFlLEdBQXFCLElBQUks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TSxDQUFDLENBQUM7UUFDbkMsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzVCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdkIsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDYixlQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxNQUFNLGFBQWEsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUM1RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1IsZUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUN4RCxDQUFDO1FBQ0gsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzNCLENBQUM7Q0FDRjs7QUFqOEJ5Qiw4QkFBb0IsR0FBRyxLQUFLLEFBQVIsQ0FBUyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCwgU2VydmVyQ29uZmlnIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyBEYXRhYmFzZU1hbmFnZXIgfSBmcm9tICcuLi9kYi9kYXRhYmFzZSc7XG5pbXBvcnQgeyBlbnN1cmVEaXJlY3RvcnlFeGlzdHMgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuaW1wb3J0IHsgTG9nZ2VyLCBMb2dMZXZlbCB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgKiBhcyBDb21tYW5kcyBmcm9tICcuLi9jb21tYW5kcyc7XG5cbi8qKlxuICogRGFoaWxpIHN1bnVjdSBheWFybGFyxLEgKHNldHRpbmdzIHRhYmxvc3VuZGFuIHnDvGtsZW5pciAvIHNha2xhbsSxcilcbiAqIFB1YmxpYyBTZXJ2ZXJDb25maWcgeWFsbsSxemNhIGRiUGF0aCwgYmFubmVyIHZlIGxvZ0xldmVsIGnDp2VyaXI7XG4gKiBwb3J0IC8gZGF0YVBvcnQgLyBtYXhDb25uZWN0aW9ucyAvIHBhc3NpdmVQb3J0UmFuZ2UgZGF0YWJhc2UnZGVuIGdlbGlyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEludGVybmFsU2VydmVyQ29uZmlnIHtcbiAgcG9ydDogbnVtYmVyO1xuICBkYXRhUG9ydDogbnVtYmVyO1xuICBtYXhDb25uZWN0aW9uczogbnVtYmVyO1xuICBsb2dMZXZlbDogJ2RlYnVnJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcic7XG4gIGJhbm5lcjogc3RyaW5nO1xuICBwYXNzaXZlUG9ydFJhbmdlOiB7IG1pbjogbnVtYmVyOyBtYXg6IG51bWJlciB9O1xuICBwYXNzaXZlSXA/OiBzdHJpbmc7XG4gIGlwPzogc3RyaW5nO1xuICBkYlBhdGg/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogRGVmYXVsdCBheWFybGFyIChzZXR0aW5ncyB0YWJsb3N1bmRhIGRlxJ9lciB5b2tzYSBidSBkZcSfZXJsZXIga3VsbGFuxLFsxLFyKVxuICovXG5jb25zdCBERUZBVUxUX0NPTkZJRzogSW50ZXJuYWxTZXJ2ZXJDb25maWcgPSB7XG4gIHBvcnQ6IDIxLFxuICBkYXRhUG9ydDogMjAsXG4gIG1heENvbm5lY3Rpb25zOiAxMDAsXG4gIGxvZ0xldmVsOiAnaW5mbycsXG4gIC8vIDIyMCBrYXLFn8SxbGFtYSBtZXNhasSxOyBib8WfIGLEsXJha8SxbMSxcnNhIG90b21hdGlrIG9sYXJhayBcIjxwb3J0PiBGVFAgU2VydmVyIFJlYWR5XCIgw7xyZXRpbGlyXG4gIGJhbm5lcjogJycsXG4gIC8vIFBBU1YgdmVyaSBiYcSfbGFudMSxIHBvcnRsYXLEsSBidSBhcmFsxLFrdGFuIHNlw6dpbGlyXG4gIHBhc3NpdmVQb3J0UmFuZ2U6IHsgbWluOiA1MDAwMCwgbWF4OiA1MDA1MCB9LFxuICBkYlBhdGg6ICcuL2Z0cGQuZGInLFxufTtcbi8qKlxuICogQXlhciBhbmFodGFybGFyxLFuxLFuIHNldHRpbmdzIHRhYmxvc3VuZGFraSBrYXLFn8SxbMSxa2xhcsSxXG4gKi9cbmV4cG9ydCBjb25zdCBTRVRUSU5HX0tFWVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIHBvcnQ6ICdmdHAucG9ydCcsXG4gIGRhdGFQb3J0OiAnZnRwLmRhdGFQb3J0JyxcbiAgbWF4Q29ubmVjdGlvbnM6ICdmdHAubWF4Q29ubmVjdGlvbnMnLFxuICBsb2dMZXZlbDogJ2Z0cC5sb2dMZXZlbCcsXG4gIGJhbm5lcjogJ2Z0cC5iYW5uZXInLFxuICBwYXNzaXZlUG9ydFJhbmdlOiAnZnRwLnBhc3NpdmVQb3J0UmFuZ2UnLFxuICBwYXNzaXZlSXA6ICdmdHAucGFzc2l2ZUlwJyxcbiAgaXA6ICdmdHAuaXAnLFxufTtcblxuLyoqIEF5YXJsYW5hYmlsaXIgYXlhciBhbmFodGFybGFyxLEgKHNldHRpbmdzIHRhYmxvc3UgaWxlIGF5bsSxIGlzaW1sZXIpICovXG5leHBvcnQgdHlwZSBTZXR0aW5nS2V5ID1cbiAgfCAncG9ydCdcbiAgfCAnZGF0YVBvcnQnXG4gIHwgJ21heENvbm5lY3Rpb25zJ1xuICB8ICdsb2dMZXZlbCdcbiAgfCAnYmFubmVyJ1xuICB8ICdwYXNzaXZlUG9ydFJhbmdlJ1xuICB8ICdwYXNzaXZlSXAnXG4gIHwgJ2lwJ1xuICB8ICdkYlBhdGgnO1xuXG4vKiogQmFubmVyJ2RhIHZlIGxvZ2RhIGfDtnN0ZXJpbGVuIGRlc3Rla2xlbmVuIEZUUCBrb211dGxhcsSxLiAqL1xuZXhwb3J0IGNvbnN0IFNVUFBPUlRFRF9DT01NQU5EUyA9ICdVU0VSLCBQQVNTLCBDV0QsIFBXRCwgTElTVCwgUkVUUiwgU1RPUiwgREVMRSwgUVVJVCwgTk9PUCc7XG5cbi8qKlxuICogRlRQIFN1bnVjdXN1IGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBGdHBTZXJ2ZXIge1xuICBwcml2YXRlIHNlcnZlcjogbmV0LlNlcnZlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRhdGFTZXJ2ZXI6IG5ldC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25uZWN0aW9uczogTWFwPHN0cmluZywgRnRwQ29ubmVjdGlvbj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZGF0YUNvbm5lY3Rpb25zOiBNYXA8c3RyaW5nLCBhbnk+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHJ1bnRpbWU6IEludGVybmFsU2VydmVyQ29uZmlnO1xuICBwcml2YXRlIGRiOiBEYXRhYmFzZU1hbmFnZXI7XG4gIHByaXZhdGUgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY29ubmVjdGlvbkNvdW50OiBudW1iZXIgPSAwO1xuICBwcml2YXRlIG1heENvbm5lY3Rpb25zOiBudW1iZXI7XG4gIC8qKiDEsMWfbGVubWVrdGUgb2xhbiBGVFAga29tdXQgc2F5xLFzxLEgKGxvZyB5YXrEsW3EsSBidSBzxLFmxLFya2VuIHlhcMSxbMSxcikgKi9cbiAgcHJpdmF0ZSBhY3RpdmVPcGVyYXRpb25zOiBudW1iZXIgPSAwO1xuICAvKiogU8O8cmTDvHLDvGxlbiB2ZXJpIGFrdGFyxLFtxLEgc2F5xLFzxLEgKGxvZyB5YXrEsW3EsSBidSBzxLFmxLFya2VuIHlhcMSxbMSxcikgKi9cbiAgcHJpdmF0ZSBhY3RpdmVUcmFuc2ZlcnM6IG51bWJlciA9IDA7XG4gIC8qKiBCb8WfYWzEsW5jYSBsb2cgdGFtcG9udW51IHlhem1hayBpw6dpbiBwbGFubGFuYW4gacWfICovXG4gIHByaXZhdGUgaWRsZUZsdXNoSGFuZGxlOiBOb2RlSlMuSW1tZWRpYXRlIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGFzc2l2ZU1vZGU6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBwYXNzaXZlSXA6IHN0cmluZyB8IG51bGwgPSBudWxsOyAvLyBudWxsIGlzZSBzdW51Y3VudW4ga2VuZGluZSB1bGHFn8SxbGFiaWxpciBJUCBvdG9tYXRpayBzZcOnaWxpclxuICBwcml2YXRlIHNlcnZlcklwOiBzdHJpbmcgfCBudWxsID0gbnVsbDsgLy8gQXlhcmxhbmFuIHN1bnVjdSBJUDsgbnVsbCBpc2UgZGlubGVtZSBhZHJlc2kgb3RvbWF0aWsgc2VjaWxpclxuICBwcml2YXRlIHBhc3NpdmVEYXRhU2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGFzc2l2ZURhdGFQb3J0OiBudW1iZXIgPSA1MDAwMDtcbiAgLyoqIFBBU1YgcG9ydCBhcmFsxLHEn8SxIMO8emVyaW5kZSBkb2xhxZ9hbiBpbWxlw6cgKi9cbiAgcHJpdmF0ZSBwYXNzaXZlUG9ydEN1cnNvcjogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBwZW5kaW5nTGlzdERhdGE6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdMaXN0Q29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nUmV0ckZpbGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdSZXRyQ29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwZW5kaW5nU3RvckZpbGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBlbmRpbmdTdG9yQ29ubklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgLyoqIFBhc2lmIHZlcmkgYmFnbGFudGlzaSBha3RhcmltIGF0YW5tYWRhbiBvbmNlIGthcGFuZGkgKGVya2VuIGthcGFubWEpICovXG4gIHByaXZhdGUgZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseTogYm9vbGVhbiA9IGZhbHNlO1xuICAvKiogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgZ2VsZW4geWFyxLFtICh0YW1hbWxhbm1hbcSxxZ8pIGtvbXV0IHNhdMSxcmxhcsSxICovXG4gIHByaXZhdGUgaW5wdXRCdWZmZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpO1xuICAvKiogQmHEn2xhbnTEsSBiYcWfxLFuYSBrb211dGxhcsSxbiBzxLFyYXlsYSBpxZ9sZW5tZXNpIGnDp2luIGt1eXJ1ayAqL1xuICBwcml2YXRlIGNvbW1hbmRRdWV1ZXM6IE1hcDxzdHJpbmcsIFByb21pc2U8dm9pZD4+ID0gbmV3IE1hcCgpO1xuICAvKiogSGVuw7x6IGt1bGxhbsSxbG1hbcSxxZ8gcGFzaWYvYWt0aWYgZGF0YSBiYcSfbGFudMSxc8SxICovXG4gIHByaXZhdGUgcGVuZGluZ0RhdGFTb2NrZXQ6IG5ldC5Tb2NrZXQgfCBudWxsID0gbnVsbDtcbiAgLyoqIFNvbiBQQVNWIGtvbXV0dW51IHZlcmVuIGJhxJ9sYW50xLEgKGRhdGEgYmHEn2xhbnTEsXPEsSBzYWhpYmkpICovXG4gIHByaXZhdGUgcGFzc2l2ZUNvbm5JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIC8qKiAxNTAgZ8O2bmRlcmlsZGlrdGVuIHNvbnJhIHZlcmkgYmHEn2xhbnTEsXPEsSBnZWxtZXpzZSBhc8SxbMSxIGthbG1hbWFrIGnDp2luIHphbWFubGF5xLFjxLEgKi9cbiAgcHJpdmF0ZSBkYXRhV2FpdFRpbWVyOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xuICAvKiogVmVyaSBiYcSfbGFudMSxc8SxIGnDp2luIGF6YW1pIGJla2xlbWUgc8O8cmVzaSAobXMpICovXG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERBVEFfV0FJVF9USU1FT1VUX01TID0gMTUwMDA7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBQYXJ0aWFsPFNlcnZlckNvbmZpZz4gPSB7fSkge1xuICAgIC8vIFNRTGl0ZSB2ZXJpdGFiYW7EsW7EsSBiYcWfbGF0ICh1c2VycyB2ZSBzZXR0aW5ncyB0YWJsb2xhcsSxKVxuICAgIHRoaXMuZGIgPSBuZXcgRGF0YWJhc2VNYW5hZ2VyKGNvbmZpZy5kYlBhdGgpO1xuICAgIHRoaXMuZGIuaW5pdCgpO1xuXG4gICAgLy8gTG9nbGFyIMO2bmNlIGJlbGxla3RlIHRhbXBvbmxhbsSxcjsgU1FMaXRlJ2EgeWFsbsSxemNhIEZUUCBpxZ9sZW1pIHlva2tlblxuICAgIC8vIHRvcGx1IG9sYXJhayB5YXrEsWzEsXIuIEZUUCBpxZ9sZW1sZXJpIGxvZyB5YXrEsW3EsW5kYW4gaGVyIHphbWFuIMO2bmNlbGlrbGlkaXIuXG4gICAgTG9nZ2VyLnNldFNpbmsoKHJlY29yZHMpID0+IHtcbiAgICAgIHRoaXMuZGIuaW5zZXJ0TG9ncyhyZWNvcmRzKTtcbiAgICB9KTtcbiAgICBMb2dnZXIuc2V0QnVzeUNoZWNrKCgpID0+IHRoaXMuaXNCdXN5KCkpO1xuXG4gICAgLy8gQXlhcmxhcsSxIHNldHRpbmdzIHRhYmxvc3VuZGFuIHnDvGtsZSwgeW9rc2EgdmFyc2F5xLFsYW5sYXLEsSBrdWxsYW5cbiAgICB0aGlzLnJ1bnRpbWUgPSB0aGlzLmxvYWRDb25maWdGcm9tU2V0dGluZ3MoY29uZmlnKSBhcyBJbnRlcm5hbFNlcnZlckNvbmZpZztcblxuICAgIHRoaXMubWF4Q29ubmVjdGlvbnMgPSB0aGlzLnJ1bnRpbWUubWF4Q29ubmVjdGlvbnMgfHwgREVGQVVMVF9DT05GSUcubWF4Q29ubmVjdGlvbnM7XG4gICAgLy8gU3VudWN1IElQOiBiaW5kIGFkcmVzaSB2ZSBQQVNWIHlhbsSxdMSxbmRhIGt1bGxhbsSxbGFjYWsgYWRyZXNcbiAgICBjb25zdCBjb25maWd1cmVkU2VydmVySXAgPSB0aGlzLm5vcm1hbGl6ZUlwKHRoaXMucnVudGltZS5pcCk7XG4gICAgaWYgKGNvbmZpZ3VyZWRTZXJ2ZXJJcCAmJiBjb25maWd1cmVkU2VydmVySXAgIT09ICcxMjcuMC4wLjEnICYmIGNvbmZpZ3VyZWRTZXJ2ZXJJcCAhPT0gJzAuMC4wLjAnKSB7XG4gICAgICB0aGlzLnNlcnZlcklwID0gY29uZmlndXJlZFNlcnZlcklwO1xuICAgIH1cblxuICAgIC8vIEHDp8Sxa8OnYSB5YXDEsWxhbmTEsXLEsWxtxLHFnyBQQVNWIElQIHlva3NhLCBzdW51Y3UgSVAga3VsbGFuXG4gICAgaWYgKHR5cGVvZiB0aGlzLnJ1bnRpbWUucGFzc2l2ZUlwID09PSAnc3RyaW5nJyAmJiB0aGlzLnJ1bnRpbWUucGFzc2l2ZUlwLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgIHRoaXMucGFzc2l2ZUlwID0gdGhpcy5ydW50aW1lLnBhc3NpdmVJcC50cmltKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNlcnZlcklwKSB7XG4gICAgICB0aGlzLnBhc3NpdmVJcCA9IHRoaXMuc2VydmVySXA7XG4gICAgfVxuXG4gICAgLy8gQmFubmVyOiBib8WfIGLEsXJha8SxbMSxcnNhIFwiPHBvcnQ+IEZUUCBTZXJ2ZXIgUmVhZHlcIlxuICAgIGNvbnN0IGJhbm5lciA9IHR5cGVvZiB0aGlzLnJ1bnRpbWUuYmFubmVyID09PSAnc3RyaW5nJyA/IHRoaXMucnVudGltZS5iYW5uZXIudHJpbSgpIDogJyc7XG4gICAgdGhpcy5ydW50aW1lLmJhbm5lciA9IGJhbm5lciAhPT0gJycgPyBiYW5uZXIgOiBgJHt0aGlzLnJ1bnRpbWUucG9ydH0gRlRQIFNlcnZlciBSZWFkeWA7XG5cbiAgICAvLyBQQVNWIHBvcnQgYXJhbMSxxJ/EsW7EsSBkb8SfcnVsYVxuICAgIHRoaXMucnVudGltZS5wYXNzaXZlUG9ydFJhbmdlID0gdGhpcy5ub3JtYWxpemVQb3J0UmFuZ2UodGhpcy5ydW50aW1lLnBhc3NpdmVQb3J0UmFuZ2UpO1xuICAgIC8vIExvZ2dlciBzZXZpeWVzaW5pIGF5YXJsYVxuICAgIGxldCBsb2dMZXZlbEVudW06IExvZ0xldmVsID0gTG9nTGV2ZWwuSU5GTztcbiAgICBpZiAodGhpcy5ydW50aW1lLmxvZ0xldmVsID09PSAnZGVidWcnKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5ERUJVRztcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVudGltZS5sb2dMZXZlbCA9PT0gJ3dhcm4nKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5XQVJOO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ydW50aW1lLmxvZ0xldmVsID09PSAnZXJyb3InKSB7XG4gICAgICBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5FUlJPUjtcbiAgICB9XG4gICAgTG9nZ2VyLnNldExldmVsKGxvZ0xldmVsRW51bSk7XG4gICAgLy8gVXNlck1hbmFnZXInxLEgYmHFn2xhdCAoU1FMaXRlICd1c2VycycgdGFibG9zdSDDvHplcmluZGVuKVxuICAgIHRoaXMudXNlck1hbmFnZXIgPSBuZXcgVXNlck1hbmFnZXIodGhpcy5kYik7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEZUUCBzZXJ2ZXIgc3RhcnRpbmcuLi5gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29udHJvbCBwb3J0OiAke3RoaXMucnVudGltZS5wb3J0fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIHBvcnQ6ICR7dGhpcy5ydW50aW1lLmRhdGFQb3J0fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBNYXggY29ubmVjdGlvbnM6ICR7dGhpcy5tYXhDb25uZWN0aW9uc31gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQmFubmVyOiAke3RoaXMucnVudGltZS5iYW5uZXJ9YCk7XG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBBU1YgcG9ydCByYW5nZTogJHt0aGlzLnJ1bnRpbWUucGFzc2l2ZVBvcnRSYW5nZS5taW59LSR7dGhpcy5ydW50aW1lLnBhc3NpdmVQb3J0UmFuZ2UubWF4fWApO1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTZXJ2ZXIgSVA6ICR7dGhpcy5zZXJ2ZXJJcCA/PyAnYXV0byAoYWxsIGludGVyZmFjZXMpJ31gKTtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1FMaXRlIGRhdGFiYXNlOiBmdHBkLmRiYCk7XG4gIH1cblxuICAvKipcbiAgICogQXlhcmxhcsSxIFNRTGl0ZSAnc2V0dGluZ3MnIHRhYmxvc3VuZGFuIHnDvGtsZS5cbiAgICogRcSfZXIgYXlhciB5b2tzYSB2YXJzYXnEsWxhbiBkZcSfZXJpIGt1bGxhbiB2ZSBzZXR0aW5ncyB0YWJsb3N1bmEga2F5ZGV0LlxuICAgKi9cbiAgcHJpdmF0ZSBsb2FkQ29uZmlnRnJvbVNldHRpbmdzKHByb3ZpZGVkOiBQYXJ0aWFsPFNlcnZlckNvbmZpZz4pOiBJbnRlcm5hbFNlcnZlckNvbmZpZyB7XG4gICAgY29uc3QgY29uZmlnOiBJbnRlcm5hbFNlcnZlckNvbmZpZyA9IHtcbiAgICAgIHBvcnQ6IERFRkFVTFRfQ09ORklHLnBvcnQsXG4gICAgICBkYXRhUG9ydDogREVGQVVMVF9DT05GSUcuZGF0YVBvcnQsXG4gICAgICBtYXhDb25uZWN0aW9uczogREVGQVVMVF9DT05GSUcubWF4Q29ubmVjdGlvbnMsXG4gICAgICBsb2dMZXZlbDogREVGQVVMVF9DT05GSUcubG9nTGV2ZWwsXG4gICAgICBiYW5uZXI6IERFRkFVTFRfQ09ORklHLmJhbm5lcixcbiAgICAgIHBhc3NpdmVQb3J0UmFuZ2U6IHsgLi4uREVGQVVMVF9DT05GSUcucGFzc2l2ZVBvcnRSYW5nZSB9LFxuICAgICAgZGJQYXRoOiBwcm92aWRlZC5kYlBhdGggPz8gREVGQVVMVF9DT05GSUcuZGJQYXRoLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IFtjb25maWdLZXksIHNldHRpbmdLZXldIG9mIE9iamVjdC5lbnRyaWVzKFNFVFRJTkdfS0VZUykpIHtcbiAgICAgIGNvbnN0IGRiVmFsdWUgPSB0aGlzLmRiLmdldFNldHRpbmcoc2V0dGluZ0tleSk7XG4gICAgICBsZXQgdmFsdWU6IGFueSA9IHVuZGVmaW5lZDtcbiAgICAgIGxldCBsb2FkZWQgPSBmYWxzZTtcblxuICAgICAgaWYgKGRiVmFsdWUgIT09IG51bGwgJiYgZGJWYWx1ZSAhPT0gJycgJiYgZGJWYWx1ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGJWYWx1ZSAhPT0gJ251bGwnKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3dpdGNoIChjb25maWdLZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3BvcnQnOlxuICAgICAgICAgICAgY2FzZSAnZGF0YVBvcnQnOlxuICAgICAgICAgICAgY2FzZSAnbWF4Q29ubmVjdGlvbnMnOiB7XG4gICAgICAgICAgICAgIGNvbnN0IG51bSA9IE51bWJlcihkYlZhbHVlKTtcbiAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShudW0pKSB7IHZhbHVlID0gbnVtOyBsb2FkZWQgPSB0cnVlOyB9XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncGFzc2l2ZVBvcnRSYW5nZSc6IHtcbiAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBTdHJpbmcoZGJWYWx1ZSkuc3BsaXQoJzonKTtcbiAgICAgICAgICAgICAgY29uc3QgbWluID0gTnVtYmVyKHBhcnRzWzBdKTtcbiAgICAgICAgICAgICAgY29uc3QgbWF4ID0gTnVtYmVyKHBhcnRzWzFdKTtcbiAgICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMiAmJiBOdW1iZXIuaXNGaW5pdGUobWluKSAmJiBOdW1iZXIuaXNGaW5pdGUobWF4KSAmJiBtaW4gPiAwICYmIG1heCA+IDAgJiYgbWluIDw9IG1heCkgeyB2YWx1ZSA9IHsgbWluLCBtYXggfTsgbG9hZGVkID0gdHJ1ZTsgfVxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6IHsgdmFsdWUgPSBkYlZhbHVlOyBsb2FkZWQgPSB0cnVlOyBicmVhazsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkgeyB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb3ZpZGVkVmFsdWUgPSAocHJvdmlkZWQgYXMgYW55KVtjb25maWdLZXldO1xuICAgICAgaWYgKCFsb2FkZWQgJiYgcHJvdmlkZWRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIHByb3ZpZGVkVmFsdWUgIT09IG51bGwpIHsgdmFsdWUgPSBwcm92aWRlZFZhbHVlOyBsb2FkZWQgPSB0cnVlOyB9XG5cbiAgICAgIGlmICghbG9hZGVkKSB7IHZhbHVlID0gKERFRkFVTFRfQ09ORklHIGFzIGFueSlbY29uZmlnS2V5XTsgfVxuXG4gICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAoY29uZmlnIGFzIGFueSlbY29uZmlnS2V5XSA9IHZhbHVlO1xuICAgICAgICBpZiAoZGJWYWx1ZSA9PT0gbnVsbCB8fCBkYlZhbHVlID09PSB1bmRlZmluZWQgfHwgZGJWYWx1ZSA9PT0gXCJcIikgeyB0aGlzLnNhdmVTZXR0aW5nVG9EYihzZXR0aW5nS2V5LCB2YWx1ZSk7IH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG4gIHByaXZhdGUgc2F2ZVNldHRpbmdUb0RiKGtleTogc3RyaW5nLCB2YWx1ZTogYW55KTogdm9pZCB7XG4gICAgbGV0IHN0clZhbHVlOiBzdHJpbmc7XG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHZhbHVlIGFzIGFueTtcbiAgICAgIGlmIChvYmoubWluICE9PSB1bmRlZmluZWQgJiYgb2JqLm1heCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN0clZhbHVlID0gYCR7b2JqLm1pbn06JHtvYmoubWF4fWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJWYWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyVmFsdWUgPSBTdHJpbmcodmFsdWUpO1xuICAgIH1cbiAgICB0aGlzLmRiLnNldFNldHRpbmcoa2V5LCBzdHJWYWx1ZSk7XG4gIH1cblxuICAvKipcbiAgICogU3VudWN1IGF5YXLEsW7EsSBnw7xuY2VsbGUgKHJ1bnRpbWUgKyBzZXR0aW5ncyB0YWJsb3N1KVxuICAgKi9cbiAgcHVibGljIHVwZGF0ZVNldHRpbmcoa2V5OiBTZXR0aW5nS2V5LCB2YWx1ZTogYW55KTogdm9pZCB7XG4gICAgKHRoaXMucnVudGltZSBhcyBhbnkpW2tleV0gPSB2YWx1ZTtcbiAgICBjb25zdCBzZXR0aW5nS2V5ID0gU0VUVElOR19LRVlTW2tleV07XG4gICAgaWYgKHNldHRpbmdLZXkpIHtcbiAgICAgIHRoaXMuc2F2ZVNldHRpbmdUb0RiKHNldHRpbmdLZXksIHZhbHVlKTtcbiAgICB9XG4gICAgLy8gw5Z6ZWwgacWfbGVtbGVyXG4gICAgaWYgKGtleSA9PT0gJ2xvZ0xldmVsJykge1xuICAgICAgbGV0IGxvZ0xldmVsRW51bTogTG9nTGV2ZWwgPSBMb2dMZXZlbC5JTkZPO1xuICAgICAgaWYgKHZhbHVlID09PSAnZGVidWcnKSBsb2dMZXZlbEVudW0gPSBMb2dMZXZlbC5ERUJVRztcbiAgICAgIGVsc2UgaWYgKHZhbHVlID09PSAnd2FybicpIGxvZ0xldmVsRW51bSA9IExvZ0xldmVsLldBUk47XG4gICAgICBlbHNlIGlmICh2YWx1ZSA9PT0gJ2Vycm9yJykgbG9nTGV2ZWxFbnVtID0gTG9nTGV2ZWwuRVJST1I7XG4gICAgICBMb2dnZXIuc2V0TGV2ZWwobG9nTGV2ZWxFbnVtKTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2Jhbm5lcicpIHtcbiAgICAgIGNvbnN0IGJhbm5lciA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZS50cmltKCkgOiAnJztcbiAgICAgIHRoaXMucnVudGltZS5iYW5uZXIgPSBiYW5uZXIgIT09ICcnID8gYmFubmVyIDogYCR7dGhpcy5ydW50aW1lLnBvcnR9IEZUUCBTZXJ2ZXIgUmVhZHlgO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpdGFiYW7EsSB5w7ZuZXRpY2lzaW5lIGVyacWfaW1cbiAgICovXG4gIC8qKlxuICAgKiBWZXJpdGFiYW7EsSB5w7ZuZXRpY2lzaW5lIGVyacWfaW1cbiAgICovXG4gIHB1YmxpYyBnZXREYigpOiBEYXRhYmFzZU1hbmFnZXIge1xuICAgIHJldHVybiB0aGlzLmRiO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIHnDtm5ldGltaW5lIGVyacWfaW0gKENMSSAvIHRlc3QpXG4gICAqL1xuICBwdWJsaWMgZ2V0VXNlck1hbmFnZXIoKTogVXNlck1hbmFnZXIgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy51c2VyTWFuYWdlcjtcbiAgfVxuXG4gIC8qKiDDh2FsxLHFn2FuIHN1bnVjdW51biBhbmzEsWsgYXlhciBiaXIga29weWFzxLEgKENMSSBzdGF0dXMvY29uZmlnIGnDp2luKSAqL1xuICBwdWJsaWMgZ2V0UnVudGltZUNvbmZpZygpOiBSZWFkb25seTxJbnRlcm5hbFNlcnZlckNvbmZpZz4ge1xuICAgIHJldHVybiB7IC4uLnRoaXMucnVudGltZSB9O1xuICB9XG5cbiAgLyoqIEF5YXLEsSBzZXR0aW5ncyB0YWJsb3N1bmRhbiBzaWwgKHNvbnJha2kgYcOnxLFsxLHFn3RhIHZhcnNhecSxbGFuYSBkw7ZuZXIpICovXG4gIHB1YmxpYyBjbGVhclNldHRpbmcoa2V5OiBTZXR0aW5nS2V5KTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2V0dGluZ0tleSA9IFNFVFRJTkdfS0VZU1trZXldO1xuICAgIGlmICghc2V0dGluZ0tleSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0aGlzLmRiLmRlbGV0ZVNldHRpbmcoc2V0dGluZ0tleSk7XG4gIH1cblxuICAvKiogxZ51IGFuZGEgYcOnxLFrIEZUUCBrb250cm9sIGJhxJ9sYW50xLFsYXLEsSAqL1xuICBwdWJsaWMgZ2V0Q29ubmVjdGlvbkNvdW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbnMuc2l6ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdW51Y3UgbWXFn2d1bCBtw7w/IEZUUCBpxZ9sZW1sZXJpIGxvZyB5YXrEsW3EsW5kYW4gw7ZuY2UgZ2VsaXI6IGJpciBrb211dFxuICAgKiBpxZ9sZW5peW9yIHZleWEgdmVyaSBha3RhcsSxbcSxIHPDvHLDvHlvcnNhIGxvZ2xhciBiZWxsZWt0ZSBiZWtsZXRpbGlyLlxuICAgKi9cbiAgcHVibGljIGlzQnVzeSgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5hY3RpdmVPcGVyYXRpb25zID4gMCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKHRoaXMuYWN0aXZlVHJhbnNmZXJzID4gMCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKHRoaXMuZGF0YVdhaXRUaW1lciAhPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwgfHwgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbCB8fCB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqIFN1bnVjdSBib8WfYWxkxLHEn8SxbmRhIHRhbXBvbmxhbmFuIGxvZ2xhcsSxIFNRTGl0ZSdhIHlheiAodGVrIHNlZmVyIHBsYW5sYW7EsXIpLiAqL1xuICBwcml2YXRlIHNjaGVkdWxlSWRsZUZsdXNoKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlkbGVGbHVzaEhhbmRsZSAhPT0gbnVsbCkgcmV0dXJuO1xuICAgIHRoaXMuaWRsZUZsdXNoSGFuZGxlID0gc2V0SW1tZWRpYXRlKCgpID0+IHtcbiAgICAgIHRoaXMuaWRsZUZsdXNoSGFuZGxlID0gbnVsbDtcbiAgICAgIGlmICghdGhpcy5pc0J1c3koKSkgTG9nZ2VyLmZsdXNoTG9ncygpO1xuICAgIH0pO1xuICAgIHRoaXMuaWRsZUZsdXNoSGFuZGxlLnVucmVmPy4oKTtcbiAgfVxuXG4gIC8qKiBBa3RhcsSxbSBiaXR0aTogc2F5YcOnIGTDvMWfZXIsIHN1bnVjdSBib8Wfc2EgbG9nIHRhbXBvbnUgeWF6xLFsxLFyLiAqL1xuICBwcml2YXRlIGZpbmlzaFRyYW5zZmVyKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmFjdGl2ZVRyYW5zZmVycyA+IDApIHRoaXMuYWN0aXZlVHJhbnNmZXJzIC09IDE7XG4gICAgdGhpcy5zY2hlZHVsZUlkbGVGbHVzaCgpO1xuICB9XG5cbiAgLyoqIFN1bnVjdSBkaW5sZW1lIHNva2V0aSBhw6fEsWsgbcSxPyAqL1xuICBwdWJsaWMgaXNMaXN0ZW5pbmcoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmVyICE9PSBudWxsICYmIHRoaXMuc2VydmVyLmxpc3RlbmluZztcbiAgfVxuICAvKipcbiAgICogUEFTViBwb3J0IGFyYWzEscSfxLFuxLEgZG/En3J1bGE7IGdlw6dlcnNpenNlIHZhcnNhecSxbGFuIGFyYWzEscSfYSBkw7ZuXG4gICAqL1xuICBwcml2YXRlIG5vcm1hbGl6ZVBvcnRSYW5nZShyYW5nZTogeyBtaW4/OiBudW1iZXI7IG1heD86IG51bWJlciB9IHwgdW5kZWZpbmVkKTogeyBtaW46IG51bWJlcjsgbWF4OiBudW1iZXIgfSB7XG4gICAgY29uc3QgZmFsbGJhY2sgPSB7IC4uLkRFRkFVTFRfQ09ORklHLnBhc3NpdmVQb3J0UmFuZ2UgfTtcbiAgICBpZiAoIXJhbmdlKSB7XG4gICAgICByZXR1cm4gZmFsbGJhY2s7XG4gICAgfVxuICAgIGNvbnN0IG1pbiA9IE1hdGguZmxvb3IoTnVtYmVyKHJhbmdlLm1pbikpO1xuICAgIGNvbnN0IG1heCA9IE1hdGguZmxvb3IoTnVtYmVyKHJhbmdlLm1heCkpO1xuICAgIGlmICghTnVtYmVyLmlzRmluaXRlKG1pbikgfHwgIU51bWJlci5pc0Zpbml0ZShtYXgpIHx8IG1pbiA8IDEgfHwgbWF4ID4gNjU1MzUgfHwgbWluID4gbWF4KSB7XG4gICAgICBMb2dnZXIud2FybihgW0Z0cFNlcnZlcl0gSW52YWxpZCBQQVNWIHBvcnQgcmFuZ2U6ICR7cmFuZ2UubWlufS0ke3JhbmdlLm1heH0sIHVzaW5nIGRlZmF1bHQgJHtmYWxsYmFjay5taW59LSR7ZmFsbGJhY2subWF4fWApO1xuICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4geyBtaW4sIG1heCB9O1xuICB9XG5cbiAgLyoqXG4gICAqIElQdjQtbWFwcGVkIElQdjYgKDo6ZmZmZjp4LngueC54KSB2ZSB6b25lIGlkICglZXRoMCkgZ2liaSBla2xlcmkgdGVtaXpsZS5cbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplSXAoYWRkcjogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IG51bGwge1xuICAgIGlmICghYWRkcikgcmV0dXJuIG51bGw7XG4gICAgbGV0IGlwID0gYWRkci50cmltKCk7XG4gICAgY29uc3Qgem9uZUluZGV4ID0gaXAuaW5kZXhPZignJScpO1xuICAgIGlmICh6b25lSW5kZXggIT09IC0xKSBpcCA9IGlwLnNsaWNlKDAsIHpvbmVJbmRleCk7XG4gICAgaWYgKGlwLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgnOjpmZmZmOicpKSBpcCA9IGlwLnNsaWNlKDcpO1xuICAgIHJldHVybiBpcCB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIMSwc3RlbWNpeWUgZMO2bmTDvHLDvGxlY2VrIHN1bnVjdW51biBrZW5kaW5lIHVsYcWfxLFsYWJpbGlyIElQdjQgYWRyZXNpbmkgYmVsaXJsZS5cbiAgICpcbiAgICogw5ZORU1MxLA6IFBBU1YgeWFuxLF0xLEgaXN0ZW1jaW5pbiBiYcSfbGFuYWNhxJ/EsSBTVU5VQ1UgYWRyZXNpbmkgacOnZXJtZWxpZGlyLlxuICAgKiDEsHN0ZW1jaW5pbiAocmVtb3RlKSBhZHJlc2kgQVNMQSBrdWxsYW7EsWxtYW1hbMSxZMSxcjsgYWtzaSBoYWxkZSBpc3RlbWNpXG4gICAqIGtlbmRpIG1ha2luZXNpbmUgYmHEn2xhbm1heWEgw6dhbMSxxZ/EsXIgdmUgRUNPTk5SRUZVU0VEIGFsxLFyLlxuICAgKlxuICAgKiDDlm5jZWxpayBzxLFyYXPEsTpcbiAgICogICAxLiBZYXDEsWxhbmTEsXJtYWRhIGHDp8Sxa8OnYSB2ZXJpbGVuIHBhc3NpdmVJcCAodmFyc2EgdmUgbG9vcGJhY2sgZGXEn2lsc2UpXG4gICAqICAgMi4gS29udHJvbCBiYcSfbGFudMSxc8SxbsSxbiB5ZXJlbCBhZHJlc2kgKGlzdGVtY2luaW4gYmHEn2xhbmTEscSfxLEgYXJhecO8eiBJUCdzaSlcbiAgICogICAzLiDEsHN0ZW1jaSBpbGUgYXluxLEgLzI0IGFsdCBhxJ/EsW5kYSBvbGFuIGJpciB5ZXJlbCBhcmF5w7x6IGFkcmVzaVxuICAgKiAgIDQuIMSwbGsgdXlndW4gKGxvb3BiYWNrIG9sbWF5YW4pIElQdjQgYXJhecO8eiBhZHJlc2lcbiAgICogICA1LiBTb24gw6dhcmUgb2xhcmFrIDEyNy4wLjAuMVxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlUGFzc2l2ZUlwKGNsaWVudFNvY2tldDogbmV0LlNvY2tldCk6IHN0cmluZyB7XG4gICAgLy8gMS4gQcOnxLFrIHlhcMSxbGFuZMSxcm1hXG4gICAgY29uc3QgY29uZmlndXJlZCA9IHRoaXMubm9ybWFsaXplSXAodGhpcy5wYXNzaXZlSXApO1xuICAgIGlmIChjb25maWd1cmVkICYmIGNvbmZpZ3VyZWQgIT09ICcxMjcuMC4wLjEnICYmIGNvbmZpZ3VyZWQgIT09ICcwLjAuMC4wJyAmJiBjb25maWd1cmVkICE9PSAnOjoxJykge1xuICAgICAgcmV0dXJuIGNvbmZpZ3VyZWQ7XG4gICAgfVxuXG4gICAgLy8gMi4gS29udHJvbCBiYcSfbGFudMSxc8SxbsSxbiB5ZXJlbCBhZHJlc2kgKGVuIGfDvHZlbmlsaXI6IGlzdGVtY2luaW4gYmHEn2xhbmTEscSfxLEgSVApXG4gICAgY29uc3QgbG9jYWwgPSB0aGlzLm5vcm1hbGl6ZUlwKGNsaWVudFNvY2tldD8ubG9jYWxBZGRyZXNzKTtcbiAgICBpZiAobG9jYWwgJiYgbmV0LmlzSVB2NChsb2NhbCkgJiYgbG9jYWwgIT09ICcxMjcuMC4wLjEnICYmIGxvY2FsICE9PSAnMC4wLjAuMCcgJiYgbG9jYWwgIT09ICc6OjEnKSB7XG4gICAgICByZXR1cm4gbG9jYWw7XG4gICAgfVxuXG4gICAgLy8gMy4gU29uIMOnYXJlOiB5ZXJlbCBiYcSfbGFudMSxIChsb2NhbGhvc3QpIHZleWEgdGVzcGl0IGVkaWxlbWV5ZW4gZHVydW0uXG4gICAgLy8gw4dva2x1IElQJ2xpIHlhcMSxbGFyZGEgb3RvbWF0aWsgc2XDp2ltIGhhdGFsxLEgb2xhYmlsZWNlxJ9pbmRlbiBidXJhZGEgdGFobWluXG4gICAgLy8geWFwbcSxeW9ydXo7IGt1bGxhbsSxY8SxIGdlcmVraXJzZSB5YXDEsWxhbmTEsXJtYWRhIGBwYXNzaXZlSXBgIGlsZSBhw6fEsWvDp2FcbiAgICAvLyBiZWxpcnRtZWxpZGlyLlxuICAgIHJldHVybiAnMTI3LjAuMC4xJztcbiAgfVxuXG4gIC8qKlxuICAgKiBTdW51Y3VudW4gZGlubGVkacSfaS9hcmF5w7x6IElQJ3NpbmkgbG9nbGFtYWsgacOnaW4gc2XDpyAoYmlsZ2kgYW1hw6dsxLEpLlxuICAgKiAwLjAuMC4wJ2EgYmluZCBlZGlsZGnEn2luZGUgaWxrIHV5Z3VuIChsb29wYmFjayBvbG1heWFuKSBJUHY0IGFkcmVzaSBrdWxsYW7EsWzEsXIuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVMaXN0ZW5JcCgpOiBzdHJpbmcge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpZmFjZXMgPSBvcy5uZXR3b3JrSW50ZXJmYWNlcygpIGFzIGFueTtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhpZmFjZXMpKSB7XG4gICAgICAgIGNvbnN0IGlmYWNlID0gaWZhY2VzW25hbWVdO1xuICAgICAgICBpZiAoIWlmYWNlKSBjb250aW51ZTtcbiAgICAgICAgZm9yIChjb25zdCBpbmZvIG9mIGlmYWNlKSB7XG4gICAgICAgICAgY29uc3QgZmFtaWx5ID0gdHlwZW9mIGluZm8uZmFtaWx5ID09PSAnc3RyaW5nJyA/IGluZm8uZmFtaWx5IDogKGluZm8uZmFtaWx5ID09PSA0ID8gJ0lQdjQnIDogJ0lQdjYnKTtcbiAgICAgICAgICBpZiAoZmFtaWx5ID09PSAnSVB2NCcgJiYgIWluZm8uaW50ZXJuYWwgJiYgaW5mby5hZGRyZXNzICYmIGluZm8uYWRkcmVzcyAhPT0gJzAuMC4wLjAnICYmIGluZm8uYWRkcmVzcyAhPT0gJzEyNy4wLjAuMScpIHtcbiAgICAgICAgICAgIGNvbnN0IGlwID0gdGhpcy5ub3JtYWxpemVJcChpbmZvLmFkZHJlc3MpO1xuICAgICAgICAgICAgaWYgKGlwICYmIG5ldC5pc0lQdjQoaXApKSByZXR1cm4gaXA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8geW9rc2F5XG4gICAgfVxuICAgIHJldHVybiAnMTI3LjAuMC4xJztcbiAgfVxuXG4gIC8qKlxuICAgKiBQQVNWIHBvcnQgYXJhbMSxxJ/EsW5kYW4gc8SxcmF5bGEgKHl1dmFybGFrIHVzdWwpIGJpciBwb3J0IHNlw6dcbiAgICovXG4gIHByaXZhdGUgbmV4dFBhc3NpdmVQb3J0KCk6IG51bWJlciB7XG4gICAgY29uc3QgeyBtaW4sIG1heCB9ID0gdGhpcy5ydW50aW1lLnBhc3NpdmVQb3J0UmFuZ2U7XG4gICAgY29uc3Qgc3BhbiA9IG1heCAtIG1pbiArIDE7XG4gICAgY29uc3QgcG9ydCA9IG1pbiArICh0aGlzLnBhc3NpdmVQb3J0Q3Vyc29yICUgc3Bhbik7XG4gICAgdGhpcy5wYXNzaXZlUG9ydEN1cnNvciA9ICh0aGlzLnBhc3NpdmVQb3J0Q3Vyc29yICsgMSkgJSBzcGFuO1xuICAgIHJldHVybiBwb3J0O1xuICB9XG5cbiAgLyoqXG4gICAqIFBBU1YgcG9ydHVudSBkaW5sZW1leWUgYWwgKGRpbmxleWljaSB6YXRlbiBvIHBvcnR0YXlzYSB5ZW5pZGVuIGt1cnVsbWF6KS5cbiAgICogMjI3IHlhbsSxdMSxIGFuY2FrIHBvcnQgZ2Vyw6dla3RlbiBkaW5sZWRpa3RlbiBzb25yYSBnw7ZuZGVyaWxpci5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlUGFzc2l2ZUxpc3RlbmVyKHBvcnQ6IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLnBhc3NpdmVEYXRhU2VydmVyICYmIHRoaXMucGFzc2l2ZURhdGFTZXJ2ZXIubGlzdGVuaW5nICYmIHRoaXMucGFzc2l2ZURhdGFQb3J0ID09PSBwb3J0KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBFc2tpIGRpbmxleWljaXlpIGthcGF0IChrYWJ1bCBlZGlsbWnFnyB2ZXJpIGJhxJ9sYW50xLFsYXLEsSBldGtpbGVubWV6KVxuICAgIGlmICh0aGlzLnBhc3NpdmVEYXRhU2VydmVyKSB7XG4gICAgICBjb25zdCBvbGRTZXJ2ZXIgPSB0aGlzLnBhc3NpdmVEYXRhU2VydmVyO1xuICAgICAgdGhpcy5wYXNzaXZlRGF0YVNlcnZlciA9IG51bGw7XG4gICAgICBvbGRTZXJ2ZXIuY2xvc2UoKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXIgPSBuZXQuY3JlYXRlU2VydmVyKChkYXRhU29ja2V0KSA9PiB7XG4gICAgICBjb25zdCBvd25lcklkID0gdGhpcy5wYXNzaXZlQ29ubklkIHx8ICcnO1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgZGF0YSBjb25uZWN0aW9uIGVzdGFibGlzaGVkOiBwb3J0ICR7cG9ydH0gKCR7b3duZXJJZH0pYCk7XG4gICAgICB0aGlzLmhhbmRsZVBhc3NpdmVEYXRhQ29ubmVjdGlvbihkYXRhU29ja2V0LCBvd25lcklkKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgICAgc2VydmVyLm9uY2UoJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFBhc3NpdmUgcG9ydCAke3BvcnR9IGNhbm5vdCBvcGVuOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgc2VydmVyLmxpc3Rlbih7IHBvcnQsIGhvc3Q6IHRoaXMuc2VydmVySXAgPz8gdW5kZWZpbmVkIH0sICgpID0+IHtcbiAgICAgICAgdGhpcy5wYXNzaXZlRGF0YVNlcnZlciA9IHNlcnZlcjtcbiAgICAgICAgdGhpcy5wYXNzaXZlRGF0YVBvcnQgPSBwb3J0O1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUGFzc2l2ZSBkYXRhIHNlcnZlciBzdGFydGVkOiBwb3J0ICR7cG9ydH1gKTtcbiAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZUUCBzdW51Y3VzdW51IGJhxZ9sYXQuXG4gICAqIGBvblJlYWR5YCwga29udHJvbCB2ZSB2ZXJpIHN1bnVjdWxhcsSxIGRpbmxlbWV5ZSBiYcWfbGFkxLFrdGFuICh2ZXlhIGhhdGFcbiAgICogYWzEsW5kxLFrdGFuKSBzb25yYSBiaXIga2V6IMOnYcSfcsSxbMSxciDigJQgQ0xJIGLDtnlsZWNlIGxvZ2xhciB0ZW1pemxlbmRpa3RlblxuICAgKiBzb25yYSBiYW5uZXInxLEgw6dpemViaWxpci5cbiAgICovXG4gIHB1YmxpYyBzdGFydChvblJlYWR5PzogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIGxldCBwZW5kaW5nID0gb25SZWFkeSA/IDIgOiAwO1xuICAgIGxldCByZWFkeUZpcmVkID0gZmFsc2U7XG4gICAgY29uc3QgZG9uZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgIGlmICghb25SZWFkeSB8fCByZWFkeUZpcmVkKSByZXR1cm47XG4gICAgICBwZW5kaW5nIC09IDE7XG4gICAgICBpZiAocGVuZGluZyA8PSAwKSB7XG4gICAgICAgIHJlYWR5RmlyZWQgPSB0cnVlO1xuICAgICAgICBvblJlYWR5KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICB0aGlzLnNlcnZlciA9IG5ldC5jcmVhdGVTZXJ2ZXIoKHNvY2tldCkgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZUNvbm5lY3Rpb24oc29ja2V0KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBeWFybGFuYW4gSVAgdmFyc2EgbyBJUCd5aSBkaW5sZSwgeW9rc2EgdMO8bSBpbnRlcmZhY2VyaSAoMC4wLjAuMCkgZGlubGVcbiAgICAgIHRoaXMuc2VydmVyLmxpc3RlbihcbiAgICAgICAgeyBwb3J0OiB0aGlzLnJ1bnRpbWUucG9ydCwgaG9zdDogdGhpcy5zZXJ2ZXJJcCA/PyB1bmRlZmluZWQgfSxcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBGVFAgc2VydmVyIHN0YXJ0ZWQ6IGZ0cDovLyR7dGhpcy5zZXJ2ZXJJcCA/PyB0aGlzLnJlc29sdmVMaXN0ZW5JcCgpfToke3RoaXMucnVudGltZS5wb3J0fWApO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTUUxpdGUgZGF0YWJhc2U6ICR7dGhpcy5ydW50aW1lLmRiUGF0aCA/PyAnZnRwZC5kYid9YCk7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbW1hbmRzOiAke1NVUFBPUlRFRF9DT01NQU5EU31gKTtcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIHRoaXMuc2VydmVyLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTZXJ2ZXIgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcnZlci5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBGVFAgc2VydmVyIGNsb3NlZGApO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIERhdGEgc2VydmVyIGJhxZ9sYXRcbiAgICAgIHRoaXMuZGF0YVNlcnZlciA9IG5ldC5jcmVhdGVTZXJ2ZXIoKGRhdGFTb2NrZXQpID0+IHtcbiAgICAgICAgdGhpcy5oYW5kbGVEYXRhQ29ubmVjdGlvbihkYXRhU29ja2V0KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmRhdGFTZXJ2ZXIubGlzdGVuKHRoaXMucnVudGltZS5kYXRhUG9ydCwgKCkgPT4ge1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gRGF0YSBzZXJ2ZXIgc3RhcnRlZDogcG9ydCAke3RoaXMucnVudGltZS5kYXRhUG9ydH1gKTtcbiAgICAgICAgZG9uZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuZGF0YVNlcnZlci5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gRGF0YSBzZXJ2ZXIgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ1tGdHBTZXJ2ZXJdIFN0YXJ0dXAgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgZG9uZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCYW5uZXIgacOnaW4gYDxpcD46PHBvcnQ+YCBhZHJlc2kgKGRpbmxleWVuIGFyYXnDvHogKyBrb250cm9sIHBvcnR1KS5cbiAgICovXG4gIHB1YmxpYyBnZXRMaXN0ZW5BZGRyZXNzKCk6IHN0cmluZyB7XG4gICAgY29uc3QgaG9zdCA9IHRoaXMuc2VydmVySXAgPz8gdGhpcy5yZXNvbHZlTGlzdGVuSXAoKTtcbiAgICByZXR1cm4gYCR7aG9zdH06JHt0aGlzLnJ1bnRpbWUucG9ydH1gO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1bnVjdXl1IGR1cmR1cjogdMO8bSBkaW5sZXlpY2lsZXJpIGthcGF0LCBhw6fEsWsgYmHEn2xhbnTEsWxhcsSxIHNvbmxhbmTEsXIgdmVcbiAgICogdmVyaXRhYmFuxLFuxLEgc2VyYmVzdCBixLFyYWsuIELDtnlsZWNlIGBleGl0YC9gcWAgc29ucmFzxLFuZGEgc8O8cmXDpyB0YWvEsWzEsVxuICAgKiBrYWxtYXog4oCUIG9sYXkgZMO2bmfDvHPDvG5kZSBiZWtsZXllbiBkaW5sZXlpY2kga2FsbWF6LlxuICAgKi9cbiAgcHVibGljIHN0b3AoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGF0YVdhaXRUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGF0YVdhaXRUaW1lcik7XG4gICAgICB0aGlzLmRhdGFXYWl0VGltZXIgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIEHDp8SxayBGVFAgYmHEn2xhbnTEsWxhcsSxbsSxIGthcGF0XG4gICAgZm9yIChjb25zdCBbY29ubklkLCBjb25uXSBvZiBbLi4udGhpcy5jb25uZWN0aW9uc10pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbm4uc29ja2V0Py5kZXN0cm95KCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gWmF0ZW4ga2FwYXTEsWxtxLHFnyBvbGFiaWxpclxuICAgICAgfVxuICAgICAgdGhpcy5jb25uZWN0aW9ucy5kZWxldGUoY29ubklkKTtcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uQ291bnQgPSAwO1xuICAgIHRoaXMuaW5wdXRCdWZmZXJzLmNsZWFyKCk7XG4gICAgdGhpcy5jb21tYW5kUXVldWVzLmNsZWFyKCk7XG5cbiAgICAvLyBCZWtsZXllbi9ha3RpZiB2ZXJpIHNva2V0bGVyaVxuICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95KCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gaWdub3JlXG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgLy8gRGlubGV5aWNpbGVyaSBrYXBhdCAoY2xvc2UoKSBoYXRhIHZlcmlyc2Ugc8O8cmXDpyB5aW5lIGRlIGJpdGViaWxpcilcbiAgICBjb25zdCBjbG9zZVF1aWV0bHkgPSAoc3J2OiBuZXQuU2VydmVyIHwgbnVsbCk6IHZvaWQgPT4ge1xuICAgICAgaWYgKCFzcnYpIHJldHVybjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHNydi5jbG9zZSgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIERpbmxleWljaSB6YXRlbiBrYXBhbMSxXG4gICAgICB9XG4gICAgfTtcbiAgICBjbG9zZVF1aWV0bHkodGhpcy5zZXJ2ZXIpO1xuICAgIGNsb3NlUXVpZXRseSh0aGlzLmRhdGFTZXJ2ZXIpO1xuICAgIGNsb3NlUXVpZXRseSh0aGlzLnBhc3NpdmVEYXRhU2VydmVyKTtcbiAgICB0aGlzLnNlcnZlciA9IG51bGw7XG4gICAgdGhpcy5kYXRhU2VydmVyID0gbnVsbDtcbiAgICB0aGlzLnBhc3NpdmVEYXRhU2VydmVyID0gbnVsbDtcblxuICAgIExvZ2dlci5pbmZvKCdbRnRwU2VydmVyXSBGVFAgc2VydmVyIHN0b3BwZWQnKTtcbiAgICAvLyBLYXBhbm1hZGFuIMO2bmNlIGJla2xleWVuIGxvZ2xhcsSxIHlheiAoYXJ0xLFrIEZUUCBpxZ9sZW1pIHlvaykuXG4gICAgTG9nZ2VyLmZsdXNoTG9ncyh0cnVlKTtcblxuICAgIHRyeSB7XG4gICAgICB0aGlzLmRiLmNsb3NlKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBWZXJpdGFiYW7EsSB6YXRlbiBrYXBhbMSxIG9sYWJpbGlyXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFllbmkgYmHEn2xhbnTEsXnEsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbm5JZCA9IGBjb25uXyR7RGF0ZS5ub3coKX1fJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTmV3IGNvbm5lY3Rpb246ICR7Y29ubklkfSAoSVA6ICR7c29ja2V0LnJlbW90ZUFkZHJlc3N9KWApO1xuXG4gICAgLy8gTWFrc2ltdW0gYmHEn2xhbnTEsSBrb250cm9sw7xcbiAgICBpZiAodGhpcy5jb25uZWN0aW9uQ291bnQgPj0gdGhpcy5tYXhDb25uZWN0aW9ucykge1xuICAgICAgc29ja2V0Py53cml0ZShgNTAzIFNlcnZpY2Ugbm90IGF2YWlsYWJsZVxcclxcbmApO1xuICAgICAgc29ja2V0LmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGlvbkNvdW50Kys7XG5cbiAgICBjb25zdCBjb25uZWN0aW9uOiBGdHBDb25uZWN0aW9uID0ge1xuICAgICAgc29ja2V0LFxuICAgICAgdXNlcjogbnVsbCxcbiAgICAgIHBhc3M6IG51bGwsXG4gICAgICBob21lRGlyOiAnJyxcbiAgICAgIGN1cnJlbnREaXI6ICcnLFxuICAgICAgcGVybWlzc2lvbnM6IHt9LFxuICAgICAgdHJhbnNmZXJNb2RlOiBudWxsLFxuICAgICAgdHJhbnNmZXJTaXplOiAwLFxuICAgICAgbGFzdFJlcGx5OiAwLFxuICAgICAgbGFzdE1lc3NhZ2U6ICcnLFxuICAgIH07XG5cbiAgICB0aGlzLmNvbm5lY3Rpb25zLnNldChjb25uSWQsIGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gQmHEn2xhbnTEsSBiYcWfbGF0bWEgbWVzYWrEsVxuICAgIHNvY2tldD8ud3JpdGUoYDIyMCAke3RoaXMucnVudGltZS5iYW5uZXJ9XFxyXFxuYCk7XG5cbiAgICAvLyBCYcSfbGFudMSxIG9sYXlsYXLEsVxuICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgIHRoaXMuaGFuZGxlQ29udHJvbERhdGEoY29ubklkLCBkYXRhKTtcbiAgICB9KTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gZXJyb3IgKCR7Y29ubklkfSk6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQsICdlcnJvcicpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBDb25uZWN0aW9uIGNsb3NlZDogJHtjb25uSWR9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCd0aW1lb3V0JywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gdGltZW91dDogJHtjb25uSWR9YCk7XG4gICAgICB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uSWQsICd0aW1lb3V0Jyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogS29udHJvbCBiYcSfbGFudMSxc8SxbmEgZ2VsZW4gdmVyaXlpIHNhdMSxciBzYXTEsXIgYXlyxLHFn3TEsXIuXG4gICAqIFRlayBwYWtldHRlIGJpcmRlbiDDp29rIGtvbXV0IGdlbGViaWxpciwgeWFyxLFtIGthbGFuIHNhdMSxciBzb25yYWtpIHBha2V0dGUgdGFtYW1sYW7EsXIuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZUNvbnRyb2xEYXRhKGNvbm5JZDogc3RyaW5nLCBkYXRhOiBCdWZmZXIpOiB2b2lkIHtcbiAgICBjb25zdCBidWZmZXIgPSAodGhpcy5pbnB1dEJ1ZmZlcnMuZ2V0KGNvbm5JZCkgfHwgJycpICsgZGF0YS50b1N0cmluZygndXRmLTgnKTtcbiAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgvXFxyXFxufFxcbnxcXHIvKTtcbiAgICAvLyBTb24gcGFyw6dhIHlhcsSxbSBzYXTEsXIgb2xhYmlsaXI6IGJpciBzb25yYWtpIHBha2V0ZSBrYWRhciBzYWtsYVxuICAgIHRoaXMuaW5wdXRCdWZmZXJzLnNldChjb25uSWQsIGxpbmVzLnBvcCgpID8/ICcnKTtcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgdGhpcy5lbnF1ZXVlQ29tbWFuZChjb25uSWQsIGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBLb211dGxhcsSxIGJhxJ9sYW50xLEgYmHFn8SxbmEgc8SxcmF5bGEgacWfbGUgKGFzeW5jIGtvbXV0bGFyIHPEsXJhecSxIGJvem1hc8SxbilcbiAgICovXG4gIHByaXZhdGUgZW5xdWV1ZUNvbW1hbmQoY29ubklkOiBzdHJpbmcsIGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy5jb21tYW5kUXVldWVzLmdldChjb25uSWQpIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIC8vIEZUUCBrb211dHUgacWfbGVtZGU6IGxvZyB0YW1wb251IGJ1IGJpdGVuZSBrYWRhciBTUUxpdGUnYSB5YXrEsWxtYXouXG4gICAgdGhpcy5hY3RpdmVPcGVyYXRpb25zICs9IDE7XG4gICAgY29uc3QgbmV4dCA9IHByZXZpb3VzXG4gICAgICAudGhlbigoKSA9PiB0aGlzLnByb2Nlc3NDb21tYW5kKGNvbm5JZCwgbGluZSkpXG4gICAgICAuY2F0Y2goKGVycikgPT4gTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBDb21tYW5kIHByb2Nlc3NpbmcgZmFpbGVkICgke2Nvbm5JZH0pOmAsIGVycikpXG4gICAgICAuZmluYWxseSgoKSA9PiB7XG4gICAgICAgIHRoaXMuYWN0aXZlT3BlcmF0aW9ucyAtPSAxO1xuICAgICAgICB0aGlzLnNjaGVkdWxlSWRsZUZsdXNoKCk7XG4gICAgICB9KTtcbiAgICB0aGlzLmNvbW1hbmRRdWV1ZXMuc2V0KGNvbm5JZCwgbmV4dCk7XG4gIH1cblxuICAvKipcbiAgICogVGVrIGJpciBrb211dCBzYXTEsXLEsW7EsSBpxZ9sZVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwcm9jZXNzQ29tbWFuZChjb25uSWQ6IHN0cmluZywgcmF3TGluZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgICAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICAgICAgaWYgKCFjb25uKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBub3QgZm91bmQ6ICR7Y29ubklkfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxpbmUgPSByYXdMaW5lLnRyaW0oKTtcbiAgICAgIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEtvbXV0dSBpbGsgYm/Fn2x1a3RhbiBiw7ZsOiBkb3N5YS8gZGl6aW4gYWRsYXLEsW5kYWtpIGJvxZ9sdWtsYXIga29ydW51clxuICAgICAgY29uc3Qgc2VwYXJhdG9ySW5kZXggPSBsaW5lLnNlYXJjaCgvXFxzLyk7XG4gICAgICBjb25zdCBjb21tYW5kID0gKHNlcGFyYXRvckluZGV4ID09PSAtMSA/IGxpbmUgOiBsaW5lLnNsaWNlKDAsIHNlcGFyYXRvckluZGV4KSkudG9VcHBlckNhc2UoKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBzZXBhcmF0b3JJbmRleCA9PT0gLTEgPyAnJyA6IGxpbmUuc2xpY2Uoc2VwYXJhdG9ySW5kZXgpLnRyaW0oKTtcblxuICAgICAgaWYgKGNvbW1hbmQgPT09ICdVU0VSJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVVc2VyKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUEFTUycpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUGFzcyhjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1FVSVQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVF1aXQoY29ubklkLCBjb25uLCAoaWQsIHJlYXNvbikgPT4gdGhpcy5jbG9zZUNvbm5lY3Rpb24oaWQsIHJlYXNvbikpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnTk9PUCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlTm9vcChjb25uSWQsIGNvbm4pO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUFdEJykge1xuICAgICAgICBhd2FpdCBDb21tYW5kcy5oYW5kbGVQd2QoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0NXRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlQ3dkKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnTElTVCcgfHwgY29tbWFuZCA9PT0gJ05MU1QnKSB7XG4gICAgICAgIGNvbnN0IGxpc3RSZXN1bHQgPSBhd2FpdCBDb21tYW5kcy5oYW5kbGVMaXN0KGNvbm5JZCwgY29ubiwgdGhpcy51c2VyTWFuYWdlciEsIHNvY2tldCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdE9iaiA9IGxpc3RSZXN1bHQgYXMgYW55O1xuICAgICAgICBpZiAocmVzdWx0T2JqICYmIHJlc3VsdE9iai5kYXRhICYmIHR5cGVvZiByZXN1bHRPYmouZGF0YSA9PT0gJ29iamVjdCcgJiYgcmVzdWx0T2JqLmRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBsaXN0RGF0YSA9IHJlc3VsdE9iai5kYXRhIGFzIHsgb3V0cHV0OiBzdHJpbmcsIGRpcmVjdG9yeTogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nTGlzdERhdGEgPSBsaXN0RGF0YS5vdXRwdXQ7XG4gICAgICAgICAgdGhpcy5wZW5kaW5nTGlzdENvbm5JZCA9IGNvbm5JZDtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gTElTVCBkYXRhIHdhaXRpbmc6ICR7bGlzdERhdGEub3V0cHV0ID8gbGlzdERhdGEub3V0cHV0Lmxlbmd0aCA6IDB9IGJ5dGVzYCk7XG4gICAgICAgICAgdGhpcy5lbnN1cmVEYXRhQ29ubmVjdGlvbihjb25uSWQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdSRVRSJykge1xuICAgICAgICBjb25zdCByZXRyUmVzdWx0ID0gYXdhaXQgQ29tbWFuZHMuaGFuZGxlUmV0cihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhLCBzb2NrZXQpO1xuICAgICAgICBjb25zdCByZXN1bHRPYmogPSByZXRyUmVzdWx0IGFzIGFueTtcbiAgICAgICAgaWYgKHJlc3VsdE9iaiAmJiByZXN1bHRPYmouZGF0YSAmJiB0eXBlb2YgcmVzdWx0T2JqLmRhdGEgPT09ICdvYmplY3QnICYmIHJlc3VsdE9iai5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgcmV0ckRhdGEgPSByZXN1bHRPYmouZGF0YSBhcyB7IGZpbGVQYXRoOiBzdHJpbmcgfTtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IHJldHJEYXRhLmZpbGVQYXRoO1xuICAgICAgICAgIHRoaXMucGVuZGluZ1JldHJDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFJFVFIgZmlsZSB3YWl0aW5nOiAke3JldHJEYXRhLmZpbGVQYXRofWApO1xuICAgICAgICAgIHRoaXMuZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnU1RPUicpIHtcbiAgICAgICAgY29uc3Qgc3RvclJlc3VsdCA9IGF3YWl0IENvbW1hbmRzLmhhbmRsZVN0b3IoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISwgc29ja2V0KTtcbiAgICAgICAgY29uc3QgcmVzdWx0T2JqID0gc3RvclJlc3VsdCBhcyBhbnk7XG4gICAgICAgIGlmIChyZXN1bHRPYmogJiYgcmVzdWx0T2JqLmRhdGEgJiYgdHlwZW9mIHJlc3VsdE9iai5kYXRhID09PSAnb2JqZWN0JyAmJiByZXN1bHRPYmouZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHN0b3JEYXRhID0gcmVzdWx0T2JqLmRhdGEgYXMgeyBmaWxlUGF0aDogc3RyaW5nIH07XG4gICAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBzdG9yRGF0YS5maWxlUGF0aDtcbiAgICAgICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gY29ubklkO1xuICAgICAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBTVE9SIGZpbGUgd2FpdGluZzogJHtzdG9yRGF0YS5maWxlUGF0aH1gKTtcbiAgICAgICAgICB0aGlzLmVuc3VyZURhdGFDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0RFTEUnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZURlbGUoY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdQQVNWJykge1xuICAgICAgICAvLyBQYXNpZiBtb2Q6IGRhdGEgYmHEn2xhbnTEsXPEsW7EsW4gc2FoaWJpIGJ1IGtvbXV0dSB2ZXJlbiBiYcSfbGFudMSxZMSxclxuICAgICAgICB0aGlzLnBhc3NpdmVDb25uSWQgPSBjb25uSWQ7XG4gICAgICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25DbG9zZWRFYXJseSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFlhcMSxbGFuZMSxcsSxbGFuIGFyYWzEsWt0YW4gcG9ydCBzZcOnIHZlIGRpbmxlbWV5ZSBhbFxuICAgICAgICBjb25zdCBwb3J0ID0gdGhpcy5uZXh0UGFzc2l2ZVBvcnQoKTtcbiAgICAgICAgY29uc3QgbGlzdGVuaW5nID0gYXdhaXQgdGhpcy5lbnN1cmVQYXNzaXZlTGlzdGVuZXIocG9ydCk7XG4gICAgICAgIGlmIChsaXN0ZW5pbmcpIHtcbiAgICAgICAgICBjb25zdCBlZmZlY3RpdmVQYXNzaXZlSXAgPSB0aGlzLnJlc29sdmVQYXNzaXZlSXAoY29ubi5zb2NrZXQpO1xuICAgICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVBhc3YoY29ubklkLCBjb25uLCBlZmZlY3RpdmVQYXNzaXZlSXAsIHBvcnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNvY2tldD8ud3JpdGUoYDQyNSBDYW5ub3Qgb3BlbiBkYXRhIGNvbm5lY3Rpb25cXHJcXG5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUE9SVCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUG9ydChjb25uLCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ0ZFQVQnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZUZlYXQoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1NZU1QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVN5c3QoY29ubklkLCBjb25uKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1RZUEUnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVR5cGUoY29ubiwgYXJncyk7XG4gICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdNS0QnKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZU1rZChjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JNRCcpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm1kKGNvbm5JZCwgY29ubiwgYXJncywgdGhpcy51c2VyTWFuYWdlciEpO1xuICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09PSAnUk5GUicpIHtcbiAgICAgICAgYXdhaXQgQ29tbWFuZHMuaGFuZGxlUm5mcihjb25uSWQsIGNvbm4sIGFyZ3MsIHRoaXMudXNlck1hbmFnZXIhKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PT0gJ1JOVE8nKSB7XG4gICAgICAgIGF3YWl0IENvbW1hbmRzLmhhbmRsZVJudG8oY29ubklkLCBjb25uLCBhcmdzLCB0aGlzLnVzZXJNYW5hZ2VyISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCaWxpbm1leWVuIGtvbXV0XG4gICAgICAgIHNvY2tldD8ud3JpdGUoYDUwMiBDb21tYW5kIG5vdCBpbXBsZW1lbnRlZDogJHtjb21tYW5kfVxcclxcbmApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIERhdGEgcHJvY2Vzc2luZyBlcnJvciAoJHtjb25uSWR9KTpgLCBlcnJvcik7XG4gICAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICAgIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYDUwMCBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcXHJcXG5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVmVyaSBiYcSfbGFudMSxc8SxbsSxIGnFn2xlXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZURhdGFDb25uZWN0aW9uKHNvY2tldDogbmV0LlNvY2tldCk6IHZvaWQge1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWRgKTtcbiAgICAvLyBEYXRhIGNvbm5lY3Rpb24gacOnaW4gacWfbGVtbGVyXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgLy8gRGF0YSB0cmFuc2ZlciBpxZ9sZW1sZXJpXG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIERhdGEgY29ubmVjdGlvbiBjbG9zZWRgKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEYXRhIGJhxJ9sYW50xLFzxLFuxLEgKFBBU1YvUE9SVCkga2FidWwgZXQgdmUgYmVrbGV5ZW4gYWt0YXLEsW3EsSBiYcSfbGEuXG4gICAqIFZlcmkgYWt0YXLEsW3EsSBrb211dCAoTElTVC9SRVRSL1NUT1IpIGdlbGRpxJ9pbmRlIGJhxZ9sYXI7IGlzdGVtY2kgdmVyaVxuICAgKiBiYcSfbGFudMSxc8SxbsSxIGtvbXV0dGFuIMO2bmNlIGHDp3TEscSfxLFuZGEgYmHEn2xhbnTEsSBiZWtsZXRpbGlyLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oc29ja2V0OiBuZXQuU29ja2V0LCBjb25uSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBQYXNzaXZlIGRhdGEgY29ubmVjdGlvbiBhY2NlcHRlZDogJHtjb25uSWR9IChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSBmYWxzZTtcblxuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9IChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdjbG9zZScsIChoYWRFcnJvcikgPT4ge1xuICAgICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPT09IHNvY2tldCkge1xuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgPSB0cnVlO1xuICAgICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2NoZWR1bGVJZGxlRmx1c2goKTtcbiAgICB9KTtcblxuICAgIC8vIEF5bsSxIGFuZGEgeWFsbsSxemNhIGJpciBkYXRhIGJhxJ9sYW50xLFzxLEga3VsbGFuxLFsxLFyXG4gICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgJiYgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCAhPT0gc29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95KCk7XG4gICAgfVxuICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBzb2NrZXQ7XG4gICAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIHBlbmRpbmdEYXRhU29ja2V0IGFzc2lnbmVkIChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgKTtcbiAgICB0aGlzLnRyeVNlcnZlRGF0YSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIExJU1QvUkVUUi9TVE9SIGnDp2luIHZlcmkgYmHEn2xhbnTEsXPEsW7EsSBoYXrEsXJsYTpcbiAgICogcGFzaWYgbW9kZGEgaXN0ZW1jaW5pbiBiYcSfbGFubWFzxLEgYmVrbGVuaXIsIGFrdGlmIG1vZGRhIChQT1JUKSBzdW51Y3UgYmHEn2xhbsSxci5cbiAgICovXG4gIHByaXZhdGUgZW5zdXJlRGF0YUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAvLyAxNTAnZGVuIHNvbnJhIGlzdGVtY2lkZSBzb25zdXogYmVrbGVtZSBvbG1hc8SxbjogZW4gZmF6IERBVEFfV0FJVF9USU1FT1VUX01TIGJla2xlXG4gICAgdGhpcy5hcm1EYXRhV2FpdFRpbWVvdXQoY29ubklkKTtcbiAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIGVuc3VyZURhdGFDb25uZWN0aW9uKCR7Y29ubklkfSk6IHBlbmRpbmcgc29ja2V0ICR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldCA/IGBleGlzdHMgKHJlbW90ZSBwb3J0ICR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldC5yZW1vdGVQb3J0fSwgZGVzdHJveWVkPSR7dGhpcy5wZW5kaW5nRGF0YVNvY2tldC5kZXN0cm95ZWR9KWAgOiAnbm9uZSd9YCk7XG4gICAgaWYgKHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgJiYgIXRoaXMucGVuZGluZ0RhdGFTb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICB0aGlzLnRyeVNlcnZlRGF0YSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbm4gPSB0aGlzLmNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgIGlmICghY29ubiB8fCBjb25uLmRhdGFNb2RlICE9PSAnYWN0aXZlJyB8fCAhY29ubi5hY3RpdmVEYXRhVGFyZ2V0KSB7XG4gICAgICAvLyBQYXNpZiBtb2Q6IGlzdGVtY2luaW4gYmFnbGFubWFzaSBiZWtsZW5pclxuICAgICAgaWYgKFxuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9uQ2xvc2VkRWFybHkgJiZcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgIT09IG51bGwgJiZcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9PT0gY29ubklkXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbkNsb3NlZEVhcmx5ID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBlbmRpbmdTdG9yRmlsZTtcbiAgICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgICB0aGlzLnBlbmRpbmdTdG9yQ29ubklkID0gbnVsbDtcbiAgICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhdGhNb2QgPSByZXF1aXJlKCdwYXRoJyk7XG4gICAgICAgICAgY29uc3QgZnNNb2QgPSByZXF1aXJlKCdmcycpO1xuICAgICAgICAgIGZzTW9kLm1rZGlyU3luYyhwYXRoTW9kLmRpcm5hbWUoZmlsZSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIGZzTW9kLndyaXRlRmlsZVN5bmMoZmlsZSwgJycpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gU1RPUiBlYXJseSBjbG9zZSBmaWxlIGVycm9yOiAkeyhlIGFzIEVycm9yKS5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgMjI2LCAnU3RvciBjb21wbGV0ZScpO1xuICAgICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUiBjb21wbGV0ZWQgdmlhIGVhcmx5IGNsb3NlOiAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gY29ubi5hY3RpdmVEYXRhVGFyZ2V0O1xuICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHRhcmdldC5wb3J0LCB0YXJnZXQuaXAsICgpID0+IHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIEFjdGl2ZSBkYXRhIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWQ6ICR7dGFyZ2V0LmlwfToke3RhcmdldC5wb3J0fWApO1xuICAgICAgdGhpcy5oYW5kbGVQYXNzaXZlRGF0YUNvbm5lY3Rpb24oc29ja2V0LCBjb25uSWQpO1xuICAgIH0pO1xuICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gQWN0aXZlIGRhdGEgY29ubmVjdGlvbiBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID09PSBzb2NrZXQpIHtcbiAgICAgICAgdGhpcy5wZW5kaW5nRGF0YVNvY2tldCA9IG51bGw7XG4gICAgICB9XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEJla2xleWVuIExJU1QvUkVUUi9TVE9SIGFrdGFyxLFtxLFuxLEsIHZlcmkgYmHEn2xhbnTEsXPEsSBoYXrEsXJzYSBiYcWfbGF0LlxuICAgKiAyMjYgeWFuxLF0xLFuxLEgdmVyaSBnZXLDp2VrdGVuIGfDtm5kZXJpbGRpa3RlbiAvIGFsxLFuZMSxa3RhbiBzb25yYSBnw7ZuZGVyLlxuICAgKi9cbiAgcHJpdmF0ZSB0cnlTZXJ2ZURhdGEoKTogdm9pZCB7XG4gICAgY29uc3Qgc29ja2V0ID0gdGhpcy5wZW5kaW5nRGF0YVNvY2tldDtcbiAgICBpZiAoIXNvY2tldCB8fCBzb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICBMb2dnZXIuZGVidWcoYFtGdHBTZXJ2ZXJdIHRyeVNlcnZlRGF0YSBza2lwcGVkOiBzb2NrZXQgJHtzb2NrZXQgPyBgZGVzdHJveWVkIChyZW1vdGUgcG9ydCAke3NvY2tldC5yZW1vdGVQb3J0fSlgIDogJ25vbmUnfSwgcGVuZGluZyBMSVNUPSR7dGhpcy5wZW5kaW5nTGlzdENvbm5JZCAhPT0gbnVsbH0gUkVUUj0ke3RoaXMucGVuZGluZ1JldHJDb25uSWQgIT09IG51bGx9IFNUT1I9JHt0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIExJU1QgLyBOTFNUXG4gICAgaWYgKHRoaXMucGVuZGluZ0xpc3REYXRhICE9PSBudWxsICYmIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnBlbmRpbmdMaXN0RGF0YTtcbiAgICAgIGNvbnN0IGNvbm5JZCA9IHRoaXMucGVuZGluZ0xpc3RDb25uSWQ7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0RGF0YSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdMaXN0Q29ubklkID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0RhdGFTb2NrZXQgPSBudWxsO1xuXG4gICAgICB0aGlzLmNsZWFyRGF0YVdhaXRUaW1lb3V0KCk7XG4gICAgICB0aGlzLmFjdGl2ZVRyYW5zZmVycyArPSAxO1xuICAgICAgc29ja2V0Lm9uY2UoJ2Nsb3NlJywgKCkgPT4gdGhpcy5maW5pc2hUcmFuc2ZlcigpKTtcbiAgICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBMSVNUIGRhdGEgc2VuZGluZzogJHtkYXRhLmxlbmd0aH0gYnl0ZXNgKTtcbiAgICAgIHNvY2tldC5vbmNlKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMud3JpdGVDb250cm9sKGNvbm5JZCwgUmVwbHlDb2RlLkxJU1RfRU5ELCAnRGlyZWN0b3J5IGxpc3RpbmcgY29tcGxldGUnKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0LndyaXRlKGRhdGEsICgpID0+IHNvY2tldC5lbmQoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUkVUUlxuICAgIGlmICh0aGlzLnBlbmRpbmdSZXRyRmlsZSAhPT0gbnVsbCAmJiB0aGlzLnBlbmRpbmdSZXRyQ29ubklkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5wZW5kaW5nUmV0ckZpbGU7XG4gICAgICBjb25zdCBjb25uSWQgPSB0aGlzLnBlbmRpbmdSZXRyQ29ubklkO1xuICAgICAgdGhpcy5wZW5kaW5nUmV0ckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcblxuICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgdGhpcy5hY3RpdmVUcmFuc2ZlcnMgKz0gMTtcbiAgICAgIHNvY2tldC5vbmNlKCdjbG9zZScsICgpID0+IHRoaXMuZmluaXNoVHJhbnNmZXIoKSk7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUkVUUiBmaWxlIHNlbmRpbmc6ICR7ZmlsZX1gKTtcbiAgICAgIGNvbnN0IHJlYWRTdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGUpO1xuICAgICAgcmVhZFN0cmVhbS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gUkVUUiByZWFkIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5GSUxFX05PVF9GT1VORCwgJ0Nhbm5vdCByZWFkIGZpbGUnKTtcbiAgICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0Lm9uY2UoJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgdGhpcy53cml0ZUNvbnRyb2woY29ubklkLCBSZXBseUNvZGUuUkVUUl9PSywgJ1JldHIgY29tcGxldGUnKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZFN0cmVhbS5waXBlKHNvY2tldCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU1RPUlxuICAgIGlmICh0aGlzLnBlbmRpbmdTdG9yRmlsZSAhPT0gbnVsbCAmJiB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5wZW5kaW5nU3RvckZpbGU7XG4gICAgICBjb25zdCBjb25uSWQgPSB0aGlzLnBlbmRpbmdTdG9yQ29ubklkO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdEYXRhU29ja2V0ID0gbnVsbDtcblxuICAgICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgICAgdGhpcy5hY3RpdmVUcmFuc2ZlcnMgKz0gMTtcbiAgICAgIHNvY2tldC5vbmNlKCdjbG9zZScsICgpID0+IHRoaXMuZmluaXNoVHJhbnNmZXIoKSk7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUiBmaWxlIHJlY2VpdmluZzogJHtmaWxlfWApO1xuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKTtcbiAgICAgIHdyaXRlU3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTVE9SIHdyaXRlIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5JTlRFUk5BTF9FUlIsICdDYW5ub3Qgd3JpdGUgZmlsZScpO1xuICAgICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgICB3cml0ZVN0cmVhbS5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5TVE9SX09LLCAnU3RvciBjb21wbGV0ZScpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQucGlwZSh3cml0ZVN0cmVhbSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSGVuw7x6IGJla2xleWVuIGFrdGFyxLFtIHlvazogYmHEn2xhbnTEsSBiaXIgc29ucmFraSBrb211dCBpw6dpbiBhw6fEsWsgdHV0dWx1clxuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsSBiZWtsZW1lIHphbWFubGF5xLFjxLFzxLFuxLEgYmHFn2xhdCAoaWtpbmNpIGtleiBiYcWfbGF0xLFsbWF6KVxuICAgKi9cbiAgcHJpdmF0ZSBhcm1EYXRhV2FpdFRpbWVvdXQoY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kYXRhV2FpdFRpbWVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGF0YVdhaXRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5kYXRhV2FpdFRpbWVyID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLnBlbmRpbmdEYXRhU29ja2V0ICYmICF0aGlzLnBlbmRpbmdEYXRhU29ja2V0LmRlc3Ryb3llZCkge1xuICAgICAgICByZXR1cm47IC8vIHZlcmkgYmHEn2xhbnTEsXPEsSBoYXrEsXIsIHNvcnVuIHlva1xuICAgICAgfVxuICAgICAgY29uc3QgcGVuZGluZyA9XG4gICAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IG51bGwgfHwgdGhpcy5wZW5kaW5nUmV0ckNvbm5JZCAhPT0gbnVsbCB8fCB0aGlzLnBlbmRpbmdTdG9yQ29ubklkICE9PSBudWxsO1xuICAgICAgaWYgKCFwZW5kaW5nIHx8IHRoaXMucGVuZGluZ0xpc3RDb25uSWQgIT09IGNvbm5JZCAmJiB0aGlzLnBlbmRpbmdSZXRyQ29ubklkICE9PSBjb25uSWQgJiYgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCAhPT0gY29ubklkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIExvZ2dlci53YXJuKGBbRnRwU2VydmVyXSBEYXRhIGNvbm5lY3Rpb24gdGltZW91dDogJHtjb25uSWR9IChubyBjb25uZWN0aW9uIGFmdGVyIDE1MClgKTtcbiAgICAgIHRoaXMuY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZCk7XG4gICAgICB0aGlzLndyaXRlQ29udHJvbChjb25uSWQsIFJlcGx5Q29kZS5UUkFOU0ZFUl9BQk9SVEVELCAnVHJhbnNmZXIgYWJvcnRlZDogZGF0YSBjb25uZWN0aW9uIHRpbWVvdXQnKTtcbiAgICB9LCBGdHBTZXJ2ZXIuREFUQV9XQUlUX1RJTUVPVVRfTVMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsSBiZWtsZW1lIHphbWFubGF5xLFjxLFzxLFuxLEgaXB0YWwgZXRcbiAgICovXG4gIHByaXZhdGUgY2xlYXJEYXRhV2FpdFRpbWVvdXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGF0YVdhaXRUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGF0YVdhaXRUaW1lcik7XG4gICAgICB0aGlzLmRhdGFXYWl0VGltZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCYcSfbGFudMSxbsSxbiBiZWtsZXllbiBha3RhcsSxbcSxbsSxIHRlbWl6bGUgKHllbmkgUEFTViBnZWxpbmNlIGVza2lzaSBnZcOnZXJzaXogb2x1cilcbiAgICovXG4gIHByaXZhdGUgY2xlYXJQZW5kaW5nVHJhbnNmZXJzKGNvbm5JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5jbGVhckRhdGFXYWl0VGltZW91dCgpO1xuICAgIGlmICh0aGlzLnBlbmRpbmdMaXN0Q29ubklkID09PSBjb25uSWQpIHtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3REYXRhID0gbnVsbDtcbiAgICAgIHRoaXMucGVuZGluZ0xpc3RDb25uSWQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5wZW5kaW5nUmV0ckNvbm5JZCA9PT0gY29ubklkKSB7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyRmlsZSA9IG51bGw7XG4gICAgICB0aGlzLnBlbmRpbmdSZXRyQ29ubklkID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMucGVuZGluZ1N0b3JDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZW5kaW5nU3RvckNvbm5JZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEtvbnRyb2wgYmHEn2xhbnTEsXPEsW5hIHlhbsSxdCBnw7ZuZGVyXG4gICAqL1xuICBwcml2YXRlIHdyaXRlQ29udHJvbChjb25uSWQ6IHN0cmluZywgY29kZTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubiAmJiBjb25uLnNvY2tldCkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBjb2RlO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICBjb25uLnNvY2tldC53cml0ZShgJHtjb2RlfSAke21lc3NhZ2V9YCArICdcXHJcXG4nKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEJhxJ9sYW50xLF5xLEga2FwYXRcbiAgICovXG4gIHB1YmxpYyBjbG9zZUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xuICAgIC8vIEJhxJ9sYW50xLF5YSBhaXQgdGFtcG9uLCBrdXlydWsgdmUgYmVrbGV5ZW4gYWt0YXLEsW0ga2F5xLF0bGFyxLFuxLEgdGVtaXpsZVxuICAgIHRoaXMuaW5wdXRCdWZmZXJzLmRlbGV0ZShjb25uSWQpO1xuICAgIHRoaXMuY29tbWFuZFF1ZXVlcy5kZWxldGUoY29ubklkKTtcbiAgICB0aGlzLmNsZWFyUGVuZGluZ1RyYW5zZmVycyhjb25uSWQpO1xuICAgIGlmICh0aGlzLnBhc3NpdmVDb25uSWQgPT09IGNvbm5JZCkge1xuICAgICAgdGhpcy5wYXNzaXZlQ29ubklkID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25uID0gdGhpcy5jb25uZWN0aW9ucy5nZXQoY29ubklkKTtcbiAgICBpZiAoY29ubikge1xuICAgICAgY29ubi5zb2NrZXQ/LmVuZCgpO1xuICAgICAgdGhpcy5jb25uZWN0aW9ucy5kZWxldGUoY29ubklkKTtcbiAgICAgIHRoaXMuY29ubmVjdGlvbkNvdW50LS07XG4gICAgICBpZiAocmVhc29uKSB7XG4gICAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gQ29ubmVjdGlvbiBjbG9zZWQ6ICR7Y29ubklkfSAocmVhc29uOiAke3JlYXNvbn0pYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENvbm5lY3Rpb24gY2xvc2VkOiAke2Nvbm5JZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zY2hlZHVsZUlkbGVGbHVzaCgpO1xuICB9XG59XG4iXX0=