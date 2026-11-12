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
exports.UserApi = void 0;
exports.startUserApi = startUserApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
class UserApi {
    constructor(config) {
        this.httpServer = null;
        this.ftpServer = config.ftpServer;
        this.port = config.port ?? 3001;
        this.userManager = this.ftpServer.getUserManager();
    }
    start() {
        return new Promise((resolve, reject) => {
            const http = require('http');
            this.httpServer = http.createServer(this.requestHandler.bind(this));
            this.httpServer.listen(this.port, () => {
                logger_1.Logger.info(`[UserApi] API running on http://localhost:${this.port}`);
                resolve();
            });
            this.httpServer.on('error', (err) => {
                reject(err);
            });
        });
    }
    stop() {
        return new Promise((resolve) => {
            if (this.httpServer) {
                this.httpServer.close(() => {
                    this.httpServer = null;
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    requestHandler(req, res) {
        const url = new URL(`http://localhost${req.url || '/'}`);
        const method = req.method ?? 'GET';
        const pathname = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        if (pathname === 'logs' && method === 'GET') {
            this.listLogs(url, res);
            return;
        }
        if (pathname === 'logs' && method === 'DELETE') {
            this.clearLogs(res);
            return;
        }
        if (pathname === 'users' && method === 'GET') {
            this.listUsers(res);
            return;
        }
        if (pathname === 'users' && method === 'POST') {
            this.addUser(req, res);
            return;
        }
        if (pathname.startsWith('users/') && method === 'DELETE') {
            const name = pathname.slice('users/'.length);
            this.deleteUser(name, res);
            return;
        }
        if (pathname.startsWith('users/') && method === 'PUT') {
            this.updateUser(req, res, pathname.slice('users/'.length));
            return;
        }
        res.writeHead(404);
        res.end(`${'✗'} not found: ${pathname}`);
    }
    listLogs(url, res) {
        const db = this.ftpServer.getDb();
        if (!db) {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end('database not available');
            return;
        }
        const sinceRaw = Number(url.searchParams.get('since'));
        const limitRaw = Number(url.searchParams.get('limit'));
        const level = (url.searchParams.get('level') ?? '').toLowerCase();
        const format = (url.searchParams.get('format') ?? 'json').toLowerCase();
        const levels = level !== '' ? (0, logger_1.levelsAtLeast)(level) : undefined;
        const entries = db.getLogs({
            sinceId: Number.isFinite(sinceRaw) && url.searchParams.has('since') ? sinceRaw : undefined,
            limit: Number.isFinite(limitRaw) && url.searchParams.has('limit') ? limitRaw : undefined,
            levels: levels && levels.length > 0 ? levels : undefined,
        });
        const headers = { 'Cache-Control': 'no-store' };
        if (format === 'text') {
            const body = entries
                .map((entry) => `${entry.createdAt} ${entry.level.toUpperCase().padEnd(5)} ${entry.message}`)
                .join('\n');
            res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(body !== '' ? `${body}\n` : '');
            return;
        }
        res.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            count: entries.length,
            total: db.getLogCount() + logger_1.Logger.getBufferedCount(),
            pending: logger_1.Logger.getBufferedCount(),
            lastId: entries.length > 0 ? entries[entries.length - 1].id : null,
            entries,
        }, null, 2));
    }
    clearLogs(res) {
        const db = this.ftpServer.getDb();
        if (!db) {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end('database not available');
            return;
        }
        const buffered = logger_1.Logger.discardBuffered();
        const deleted = db.clearLogs();
        logger_1.Logger.info(`[UserApi] Logs cleared via API (${deleted} rows, ${buffered} buffered)`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`logs cleared (${deleted} rows)`);
    }
    async listUsers(res) {
        const users = this.userManager.listUsers(true);
        const lines = [];
        for (const u of users) {
            const perms = this.userManager.getDb()?.toLinuxString(u.permissions) ?? 'rwxr-xr-x';
            lines.push(`${u.username} active:${u.isActive} home:${u.homeDir} perms:${perms}`);
        }
        const body = lines.join('\n') || '(no users)';
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(body);
    }
    async addUser(req, res) {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = body.trim() ? JSON.parse(body) : {};
                const { username, password, homeDir, permissions } = data;
                if (!username || !password) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('username and password are required');
                    return;
                }
                const home = homeDir ?? '.';
                const homePath = path.resolve(home);
                if (!fs.existsSync(homePath)) {
                    fs.mkdirSync(homePath, { recursive: true });
                }
                const perms = permissions ?? 'rwxr-xr-x';
                if (!/^[rwx-]{9}$/.test(perms)) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('invalid permissions format, expected rwxr-xr-x');
                    return;
                }
                const db = this.userManager.getDb();
                if (!db) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('database not available');
                    return;
                }
                const added = this.userManager.addUser(username, password, homePath, db.fromLinuxString(perms));
                if (added) {
                    res.writeHead(201, { 'Content-Type': 'text/plain' });
                    res.end(`user ${username} created`);
                }
                else {
                    res.writeHead(409, { 'Content-Type': 'text/plain' });
                    res.end(`user already exists: ${username}`);
                }
            }
            catch (e) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end(`invalid json: ${e.message}`);
            }
        });
    }
    async deleteUser(name, res) {
        const account = this.userManager.findUser(name, true);
        const homeDir = account?.homeDir ?? '.';
        const removed = this.userManager.deleteUser(name);
        if (!removed) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`no such user: ${name}`);
            return;
        }
        if (homeDir && homeDir !== '.' && homeDir !== process.cwd()) {
            try {
                if (fs.existsSync(homeDir)) {
                    fs.rmSync(homeDir, { recursive: true, force: true });
                }
            }
            catch (e) {
                logger_1.Logger.error(`[api deleteUser] Failed to remove home dir ${homeDir}:`, e);
            }
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`user ${name} deleted`);
    }
    async updateUser(req, res, name) {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = body.trim() ? JSON.parse(body) : {};
                const userManager = this.ftpServer.getUserManager();
                if (!userManager) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('user manager not initialized');
                    return;
                }
                const changes = {};
                if (data.password)
                    changes.password = data.password;
                if (data.home) {
                    const homeDir = path.resolve(data.home);
                    if (!fs.existsSync(homeDir))
                        fs.mkdirSync(homeDir, { recursive: true });
                    changes.home = data.home;
                }
                if (data.perm) {
                    if (!/^[rwx-]{9}$/.test(data.perm)) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('invalid permissions format');
                        return;
                    }
                    changes.perm = data.perm;
                }
                if (changes.password !== undefined) {
                    const pwUpdated = userManager.changePassword(name, changes.password);
                    if (!pwUpdated) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end(`could not update password for ${name}`);
                        return;
                    }
                }
                if (changes.home !== undefined) {
                    const homeDir = path.resolve(changes.home);
                    if (!fs.existsSync(homeDir))
                        fs.mkdirSync(homeDir, { recursive: true });
                    const hmUpdated = userManager.changeHomeDir(name, homeDir);
                    if (!hmUpdated) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end(`could not change home dir for ${name}`);
                        return;
                    }
                }
                if (changes.perm !== undefined) {
                    const db = userManager.getDb();
                    if (!db) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('database not available');
                        return;
                    }
                    const permUpdated = userManager.updatePermissions(name, db.fromLinuxString(changes.perm));
                    if (!permUpdated) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end(`could not update permissions for ${name}`);
                        return;
                    }
                }
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(`user ${name} updated`);
            }
            catch (e) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end(`invalid json: ${e.message}`);
            }
        });
    }
}
exports.UserApi = UserApi;
async function startUserApi(ftpServer, port = 3001) {
    const api = new UserApi({ ftpServer, port });
    await api.start();
    return api;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlckFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hcGkvVXNlckFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxFQUFFLCtCQUFXO0FBQ3pCLE1BQVksSUFBSSxpQ0FBYTtBQU03Qiw0Q0FBd0Q7QUFheEQ7SUFNRSxZQUFZLE1BQXFCO1FBTHpCLGVBQVUsR0FBaUMsSUFBSSxDQUFDO1FBTXRELElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUcsQ0FBQztJQUN0RCxDQUFDO0lBR00sS0FBSztRQUNWLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxVQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO2dCQUN0QyxlQUFNLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDdEUsT0FBTyxFQUFFLENBQUM7WUFDWixDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxVQUFXLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQTBCLEVBQUUsRUFBRTtnQkFDMUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxD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QUUsQ0FBQztnQkFDWCxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO2dCQUNyRCxHQUFHLENBQUMsR0FBRyxDQUFDLGlCQUFrQixDQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNuRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7O0FBR00sS0FBSyx1QkFBdUIsU0FBb0IsRUFBRSxJQUFJLEdBQUcsSUFBSTtJQUNsRSxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzdDLE1BQU0sR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2xCLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmltcG9ydCB7IEZ0cFNlcnZlciB9IGZyb20gJy4uL2NvcmUvRnRwU2VydmVyJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgRGF0YWJhc2VNYW5hZ2VyIH0gZnJvbSAnLi4vZGIvZGF0YWJhc2UnO1xuaW1wb3J0IHsgVXNlciwgVXNlclBlcm1pc3Npb25zIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgTG9nZ2VyLCBsZXZlbHNBdExlYXN0IH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcblxuaW50ZXJmYWNlIFVzZXJBcGlDb25maWcge1xuICBmdHBTZXJ2ZXI6IEZ0cFNlcnZlcjtcbiAgcG9ydD86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBZw7ZuZXRpbSBBUEknc2kgKEhUVFApLlxuICogLSAvdXNlcnMgOiBrdWxsYW7EsWPEsSBsaXN0ZWxlbWUvZWtsZW1lL3NpbG1lL2fDvG5jZWxsZW1lXG4gKiAtIC9sb2dzICA6IFNRTGl0ZSAnbG9ncycgdGFibG9zdW5kYWtpIHN1bnVjdSBsb2dsYXLEsSAoc3VudWN1IGxvZ2xhcsSxXG4gKiAgICAgICAgICAgIGtvbnNvbGEgZGXEn2lsIHlhbG7EsXpjYSBidSBBUEkgw7x6ZXJpbmRlbiBnw7ZzdGVyaWxpcilcbiAqL1xuZXhwb3J0IGNsYXNzIFVzZXJBcGkge1xuICBwcml2YXRlIGh0dHBTZXJ2ZXI6IGltcG9ydCgnaHR0cCcpLlNlcnZlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBvcnQ6IG51bWJlcjtcbiAgcHJpdmF0ZSB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXI7XG4gIHByaXZhdGUgZnRwU2VydmVyOiBGdHBTZXJ2ZXI7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBVc2VyQXBpQ29uZmlnKSB7XG4gICAgdGhpcy5mdHBTZXJ2ZXIgPSBjb25maWcuZnRwU2VydmVyO1xuICAgIHRoaXMucG9ydCA9IGNvbmZpZy5wb3J0ID8/IDMwMDE7XG4gICAgdGhpcy51c2VyTWFuYWdlciA9IHRoaXMuZnRwU2VydmVyLmdldFVzZXJNYW5hZ2VyKCkhO1xuICB9XG5cbiAgLyoqIEhUVFAgc3VudWN1eXUgYmHFn2xhdCAqL1xuICBwdWJsaWMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGh0dHAgPSByZXF1aXJlKCdodHRwJyk7XG4gICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLnJlcXVlc3RIYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5odHRwU2VydmVyIS5saXN0ZW4odGhpcy5wb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbVXNlckFwaV0gQVBJIHJ1bm5pbmcgb24gaHR0cDovL2xvY2FsaG9zdDoke3RoaXMucG9ydH1gKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmh0dHBTZXJ2ZXIhLm9uKCdlcnJvcicsIChlcnI6IE5vZGVKUy5FcnJub0V4Y2VwdGlvbikgPT4ge1xuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEhUVFAgc3VudWN1eXUgZHVyZHVyICovXG4gIHB1YmxpYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IG51bGwhO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlcXVlc3RIYW5kbGVyKHJlcTogaW1wb3J0KCdodHRwJykuSW5jb21pbmdNZXNzYWdlLCByZXM6IGltcG9ydCgnaHR0cCcpLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChgaHR0cDovL2xvY2FsaG9zdCR7cmVxLnVybCB8fCAnLyd9YCk7XG4gICAgY29uc3QgbWV0aG9kID0gcmVxLm1ldGhvZCA/PyAnR0VUJztcbiAgICBjb25zdCBwYXRobmFtZSA9IHVybC5wYXRobmFtZS5zdGFydHNXaXRoKCcvJykgPyB1cmwucGF0aG5hbWUuc2xpY2UoMSkgOiB1cmwucGF0aG5hbWU7XG5cbiAgICAvLyBDT1JTIGhlYWRlcmVsZXJpXG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnKTtcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZScpO1xuXG4gICAgLy8gT1BUSU9OUyBpc3RlxJ9pIChwcmVmbGlnaHQpXG4gICAgaWYgKG1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgICByZXMud3JpdGVIZWFkKDIwNCk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gL2xvZ3MgLT4gU1FMaXRlIGxvZ3MgdGFibG9zdVxuICAgIGlmIChwYXRobmFtZSA9PT0gJ2xvZ3MnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgIHRoaXMubGlzdExvZ3ModXJsLCByZXMpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIC9sb2dzIC0+IGxvZ2xhcsSxIHRlbWl6bGUgKERFTEVURSlcbiAgICBpZiAocGF0aG5hbWUgPT09ICdsb2dzJyAmJiBtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICB0aGlzLmNsZWFyTG9ncyhyZXMpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIC91c2VycyAtPiBMaXN0ZWxlXG4gICAgaWYgKHBhdGhuYW1lID09PSAndXNlcnMnICYmIG1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgIHRoaXMubGlzdFVzZXJzKHJlcyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gL3VzZXJzIC0+IFllbmkga3VsbGFuxLFjxLEgZWtsZSAoUE9TVClcbiAgICBpZiAocGF0aG5hbWUgPT09ICd1c2VycycgJiYgbWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgIHRoaXMuYWRkVXNlcihyZXEsIHJlcyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gL3VzZXJzLzpuYW1lIC0+IEt1bGxhbsSxY8SxIHNpbCAoREVMRVRFKVxuICAgIGlmIChwYXRobmFtZS5zdGFydHNXaXRoKCd1c2Vycy8nKSAmJiBtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICBjb25zdCBuYW1lID0gcGF0aG5hbWUuc2xpY2UoJ3VzZXJzLycubGVuZ3RoKTtcbiAgICAgIHRoaXMuZGVsZXRlVXNlcihuYW1lLCByZXMpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIC91c2Vycy86bmFtZSAtPiBLdWxsYW7EsWPEsSBnw7xuY2VsbGUgKFBVVClcbiAgICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aCgndXNlcnMvJykgJiYgbWV0aG9kID09PSAnUFVUJykge1xuICAgICAgdGhpcy51cGRhdGVVc2VyKHJlcSwgcmVzLCBwYXRobmFtZS5zbGljZSgndXNlcnMvJy5sZW5ndGgpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgcmVzLmVuZChgJHsn4pyXJ30gbm90IGZvdW5kOiAke3BhdGhuYW1lfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNRTGl0ZSAnbG9ncycgdGFibG9zdW51IG9rdS5cbiAgICogICBHRVQgL2xvZ3M/bGltaXQ9MjAwJnNpbmNlPTxpZD4mbGV2ZWw9aW5mbyZmb3JtYXQ9dGV4dFxuICAgKiAgIC0gbGltaXQgOiBzb24gTiBrYXnEsXQgKDEtMTAwMCwgdmFyc2F5xLFsYW4gMjAwKVxuICAgKiAgIC0gc2luY2UgOiB5YWxuxLF6Y2EgYnUgaWQnZGVuIHNvbnJha2kga2F5xLF0bGFyIChjYW5sxLEgdGFraXAgacOnaW4pXG4gICAqICAgLSBsZXZlbCA6IGVuIGF6IGJ1IMO2bmVtIGTDvHpleWluZGVraSBrYXnEsXRsYXIgKGRlYnVnfGluZm98d2FybnxlcnJvcilcbiAgICogICAtIGZvcm1hdDoganNvbiAodmFyc2F5xLFsYW4pIHwgdGV4dFxuICAgKi9cbiAgcHJpdmF0ZSBsaXN0TG9ncyh1cmw6IFVSTCwgcmVzOiBpbXBvcnQoJ2h0dHAnKS5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xuICAgIGNvbnN0IGRiID0gdGhpcy5mdHBTZXJ2ZXIuZ2V0RGIoKTtcbiAgICBpZiAoIWRiKSB7XG4gICAgICByZXMud3JpdGVIZWFkKDUwMywgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgICAgcmVzLmVuZCgnZGF0YWJhc2Ugbm90IGF2YWlsYWJsZScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNpbmNlUmF3ID0gTnVtYmVyKHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdzaW5jZScpKTtcbiAgICBjb25zdCBsaW1pdFJhdyA9IE51bWJlcih1cmwuc2VhcmNoUGFyYW1zLmdldCgnbGltaXQnKSk7XG4gICAgY29uc3QgbGV2ZWwgPSAodXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2xldmVsJykgPz8gJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgZm9ybWF0ID0gKHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdmb3JtYXQnKSA/PyAnanNvbicpLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgbGV2ZWxzID0gbGV2ZWwgIT09ICcnID8gbGV2ZWxzQXRMZWFzdChsZXZlbCkgOiB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBlbnRyaWVzID0gZGIuZ2V0TG9ncyh7XG4gICAgICBzaW5jZUlkOiBOdW1iZXIuaXNGaW5pdGUoc2luY2VSYXcpICYmIHVybC5zZWFyY2hQYXJhbXMuaGFzKCdzaW5jZScpID8gc2luY2VSYXcgOiB1bmRlZmluZWQsXG4gICAgICBsaW1pdDogTnVtYmVyLmlzRmluaXRlKGxpbWl0UmF3KSAmJiB1cmwuc2VhcmNoUGFyYW1zLmhhcygnbGltaXQnKSA/IGxpbWl0UmF3IDogdW5kZWZpbmVkLFxuICAgICAgbGV2ZWxzOiBsZXZlbHMgJiYgbGV2ZWxzLmxlbmd0aCA+IDAgPyBsZXZlbHMgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCBoZWFkZXJzID0geyAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZScgfTtcblxuICAgIGlmIChmb3JtYXQgPT09ICd0ZXh0Jykge1xuICAgICAgY29uc3QgYm9keSA9IGVudHJpZXNcbiAgICAgICAgLm1hcCgoZW50cnkpID0+IGAke2VudHJ5LmNyZWF0ZWRBdH0gJHtlbnRyeS5sZXZlbC50b1VwcGVyQ2FzZSgpLnBhZEVuZCg1KX0gJHtlbnRyeS5tZXNzYWdlfWApXG4gICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7IC4uLmhlYWRlcnMsICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOCcgfSk7XG4gICAgICByZXMuZW5kKGJvZHkgIT09ICcnID8gYCR7Ym9keX1cXG5gIDogJycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7IC4uLmhlYWRlcnMsICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcgfSk7XG4gICAgcmVzLmVuZChcbiAgICAgIEpTT04uc3RyaW5naWZ5KFxuICAgICAgICB7XG4gICAgICAgICAgY291bnQ6IGVudHJpZXMubGVuZ3RoLFxuICAgICAgICAgIHRvdGFsOiBkYi5nZXRMb2dDb3VudCgpICsgTG9nZ2VyLmdldEJ1ZmZlcmVkQ291bnQoKSxcbiAgICAgICAgICBwZW5kaW5nOiBMb2dnZXIuZ2V0QnVmZmVyZWRDb3VudCgpLFxuICAgICAgICAgIGxhc3RJZDogZW50cmllcy5sZW5ndGggPiAwID8gZW50cmllc1tlbnRyaWVzLmxlbmd0aCAtIDFdLmlkIDogbnVsbCxcbiAgICAgICAgICBlbnRyaWVzLFxuICAgICAgICB9LFxuICAgICAgICBudWxsLFxuICAgICAgICAyLFxuICAgICAgKSxcbiAgICApO1xuICB9XG5cbiAgLyoqIFNRTGl0ZSAnbG9ncycgdGFibG9zdW51IGJvxZ9hbHQuICovXG4gIHByaXZhdGUgY2xlYXJMb2dzKHJlczogaW1wb3J0KCdodHRwJykuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBjb25zdCBkYiA9IHRoaXMuZnRwU2VydmVyLmdldERiKCk7XG4gICAgaWYgKCFkYikge1xuICAgICAgcmVzLndyaXRlSGVhZCg1MDMsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgIHJlcy5lbmQoJ2RhdGFiYXNlIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gQmVsbGVrdGUgYmVrbGV5ZW4ga2F5xLF0bGFyIGRhIHNpbGlubWVsaSwgeW9rc2EgYmlyYXogc29ucmEgREIneWUgZ2VyaSB5YXrEsWzEsXIuXG4gICAgY29uc3QgYnVmZmVyZWQgPSBMb2dnZXIuZGlzY2FyZEJ1ZmZlcmVkKCk7XG4gICAgY29uc3QgZGVsZXRlZCA9IGRiLmNsZWFyTG9ncygpO1xuICAgIExvZ2dlci5pbmZvKGBbVXNlckFwaV0gTG9ncyBjbGVhcmVkIHZpYSBBUEkgKCR7ZGVsZXRlZH0gcm93cywgJHtidWZmZXJlZH0gYnVmZmVyZWQpYCk7XG4gICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICByZXMuZW5kKGBsb2dzIGNsZWFyZWQgKCR7ZGVsZXRlZH0gcm93cylgKTtcbiAgfVxuXG4gIC8qKiBLdWxsYW7EsWPEsWxhcsSxIGxpc3RlbGUgKi9cbiAgcHJpdmF0ZSBhc3luYyBsaXN0VXNlcnMocmVzOiBpbXBvcnQoJ2h0dHAnKS5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVzZXJzID0gdGhpcy51c2VyTWFuYWdlci5saXN0VXNlcnModHJ1ZSk7XG4gICAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCB1IG9mIHVzZXJzKSB7XG4gICAgICBjb25zdCBwZXJtcyA9IHRoaXMudXNlck1hbmFnZXIuZ2V0RGIoKT8udG9MaW51eFN0cmluZyh1LnBlcm1pc3Npb25zKSA/PyAncnd4ci14ci14JztcbiAgICAgIGxpbmVzLnB1c2goYCR7dS51c2VybmFtZX0gYWN0aXZlOiR7dS5pc0FjdGl2ZX0gaG9tZToke3UuaG9tZURpcn0gcGVybXM6JHtwZXJtc31gKTtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IGxpbmVzLmpvaW4oJ1xcbicpIHx8ICcobm8gdXNlcnMpJztcbiAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgIHJlcy5lbmQoYm9keSk7XG4gIH1cblxuICAvKiogWWVuaSBrdWxsYW7EsWPEsSBla2xlICovXG4gIHByaXZhdGUgYXN5bmMgYWRkVXNlcihyZXE6IGltcG9ydCgnaHR0cCcpLkluY29taW5nTWVzc2FnZSwgcmVzOiBpbXBvcnQoJ2h0dHAnKS5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxldCBib2R5ID0gJyc7XG4gICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBzdHJpbmcpID0+IHsgYm9keSArPSBjaHVuazsgfSk7XG4gICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBkYXRhID0gYm9keS50cmltKCkgPyBKU09OLnBhcnNlKGJvZHkpIDoge307XG4gICAgICAgIGNvbnN0IHsgdXNlcm5hbWUsIHBhc3N3b3JkLCBob21lRGlyLCBwZXJtaXNzaW9ucyB9ID0gZGF0YTtcblxuICAgICAgICBpZiAoIXVzZXJuYW1lIHx8ICFwYXNzd29yZCkge1xuICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicgfSk7XG4gICAgICAgICAgcmVzLmVuZCgndXNlcm5hbWUgYW5kIHBhc3N3b3JkIGFyZSByZXF1aXJlZCcpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhvbWUgZGl6aW5pIHZhcnNhIG9sdcWfdHVyLCB5b2tzYSB2YXJzYXnEsWxhblxuICAgICAgICBjb25zdCBob21lID0gaG9tZURpciA/PyAnLic7XG4gICAgICAgIGNvbnN0IGhvbWVQYXRoID0gcGF0aC5yZXNvbHZlKGhvbWUpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaG9tZVBhdGgpKSB7XG4gICAgICAgICAgZnMubWtkaXJTeW5jKGhvbWVQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBlcm1zID0gcGVybWlzc2lvbnMgPz8gJ3J3eHIteHIteCc7XG4gICAgICAgIGlmICghL15bcnd4LV17OX0kLy50ZXN0KHBlcm1zKSkge1xuICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicgfSk7XG4gICAgICAgICAgcmVzLmVuZCgnaW52YWxpZCBwZXJtaXNzaW9ucyBmb3JtYXQsIGV4cGVjdGVkIHJ3eHIteHIteCcpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRiID0gdGhpcy51c2VyTWFuYWdlci5nZXREYigpO1xuICAgICAgICBpZiAoIWRiKSB7XG4gICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgICAgICByZXMuZW5kKCdkYXRhYmFzZSBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnVzZXJNYW5hZ2VyLmFkZFVzZXIodXNlcm5hbWUsIHBhc3N3b3JkLCBob21lUGF0aCwgZGIuZnJvbUxpbnV4U3RyaW5nKHBlcm1zKSk7XG4gICAgICAgIGlmIChhZGRlZCkge1xuICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAxLCB7ICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicgfSk7XG4gICAgICAgICAgcmVzLmVuZChgdXNlciAke3VzZXJuYW1lfSBjcmVhdGVkYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDksIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgICAgICByZXMuZW5kKGB1c2VyIGFscmVhZHkgZXhpc3RzOiAke3VzZXJuYW1lfWApO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicgfSk7XG4gICAgICAgIHJlcy5lbmQoYGludmFsaWQganNvbjogJHsoZSBhcyBFcnJvcikubWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBLdWxsYW7EsWPEsSBzaWwgKi9cbiAgcHJpdmF0ZSBhc3luYyBkZWxldGVVc2VyKG5hbWU6IHN0cmluZywgcmVzOiBpbXBvcnQoJ2h0dHAnKS5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIEt1bGxhbsSxY8SxbsSxbiBob21lIGRpemluaW5pIGJ1bFxuICAgIGNvbnN0IGFjY291bnQgPSB0aGlzLnVzZXJNYW5hZ2VyLmZpbmRVc2VyKG5hbWUsIHRydWUpO1xuICAgIGNvbnN0IGhvbWVEaXIgPSBhY2NvdW50Py5ob21lRGlyID8/ICcuJztcblxuICAgIC8vIMOWbmNlIHZlcml0YWJhbsSxbmRhbi9tYW5hZ2VyJ2RhbiBzaWxcbiAgICBjb25zdCByZW1vdmVkID0gdGhpcy51c2VyTWFuYWdlci5kZWxldGVVc2VyKG5hbWUpO1xuICAgIGlmICghcmVtb3ZlZCkge1xuICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgIHJlcy5lbmQoYG5vIHN1Y2ggdXNlcjogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEhvbWUgZGl6aW5pbmkgZGUgc2lsICh2YXJzYSB2ZSBob21lIHZhcnNhKVxuICAgIGlmIChob21lRGlyICYmIGhvbWVEaXIgIT09ICcuJyAmJiBob21lRGlyICE9PSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhob21lRGlyKSkge1xuICAgICAgICAgIGZzLnJtU3luYyhob21lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbYXBpIGRlbGV0ZVVzZXJdIEZhaWxlZCB0byByZW1vdmUgaG9tZSBkaXIgJHtob21lRGlyfTpgLCBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgIHJlcy5lbmQoYHVzZXIgJHtuYW1lfSBkZWxldGVkYCk7XG4gIH1cblxuICAvKiogS3VsbGFuxLFjxLEgZ8O8bmNlbGxlICovXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlVXNlcihcbiAgICByZXE6IGltcG9ydCgnaHR0cCcpLkluY29taW5nTWVzc2FnZSxcbiAgICByZXM6IGltcG9ydCgnaHR0cCcpLlNlcnZlclJlc3BvbnNlLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGJvZHkgPSAnJztcbiAgICByZXEub24oJ2RhdGEnLCAoY2h1bms6IHN0cmluZykgPT4geyBib2R5ICs9IGNodW5rOyB9KTtcbiAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBib2R5LnRyaW0oKSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fTtcbiAgICAgICAgY29uc3QgdXNlck1hbmFnZXIgPSB0aGlzLmZ0cFNlcnZlci5nZXRVc2VyTWFuYWdlcigpO1xuICAgICAgICBpZiAoIXVzZXJNYW5hZ2VyKSB7XG4gICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgICAgICByZXMuZW5kKCd1c2VyIG1hbmFnZXIgbm90IGluaXRpYWxpemVkJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hhbmdlczogeyBwYXNzd29yZD86IHN0cmluZzsgaG9tZT86IHN0cmluZzsgcGVybT86IHN0cmluZyB9ID0ge307XG5cbiAgICAgICAgaWYgKGRhdGEucGFzc3dvcmQpIGNoYW5nZXMucGFzc3dvcmQgPSBkYXRhLnBhc3N3b3JkO1xuICAgICAgICBpZiAoZGF0YS5ob21lKSB7XG4gICAgICAgICAgY29uc3QgaG9tZURpciA9IHBhdGgucmVzb2x2ZShkYXRhLmhvbWUpO1xuICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhob21lRGlyKSkgZnMubWtkaXJTeW5jKGhvbWVEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIGNoYW5nZXMuaG9tZSA9IGRhdGEuaG9tZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5wZXJtKSB7XG4gICAgICAgICAgaWYgKCEvXltyd3gtXXs5fSQvLnRlc3QoZGF0YS5wZXJtKSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgICAgICAgIHJlcy5lbmQoJ2ludmFsaWQgcGVybWlzc2lvbnMgZm9ybWF0Jyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNoYW5nZXMucGVybSA9IGRhdGEucGVybTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIMWeaWZyZSBkZcSfacWfaWtsacSfaVxuICAgICAgICBpZiAoY2hhbmdlcy5wYXNzd29yZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgcHdVcGRhdGVkID0gdXNlck1hbmFnZXIuY2hhbmdlUGFzc3dvcmQobmFtZSwgY2hhbmdlcy5wYXNzd29yZCEpO1xuICAgICAgICAgIGlmICghcHdVcGRhdGVkKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgICAgICAgICAgcmVzLmVuZChgY291bGQgbm90IHVwZGF0ZSBwYXNzd29yZCBmb3IgJHtuYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhvbWUgZGl6aW5pIGRlxJ9pxZ9pa2xpxJ9pXG4gICAgICAgIGlmIChjaGFuZ2VzLmhvbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IGhvbWVEaXIgPSBwYXRoLnJlc29sdmUoY2hhbmdlcy5ob21lKTtcbiAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaG9tZURpcikpIGZzLm1rZGlyU3luYyhob21lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICBjb25zdCBobVVwZGF0ZWQgPSB1c2VyTWFuYWdlci5jaGFuZ2VIb21lRGlyKG5hbWUsIGhvbWVEaXIpO1xuICAgICAgICAgIGlmICghaG1VcGRhdGVkKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgICAgICAgICAgcmVzLmVuZChgY291bGQgbm90IGNoYW5nZSBob21lIGRpciBmb3IgJHtuYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIMSwemluIGRlxJ9pxZ9pa2xpxJ9pXG4gICAgICAgIGlmIChjaGFuZ2VzLnBlcm0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IGRiID0gdXNlck1hbmFnZXIuZ2V0RGIoKTtcbiAgICAgICAgICBpZiAoIWRiKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgICAgICAgICAgcmVzLmVuZCgnZGF0YWJhc2Ugbm90IGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBwZXJtVXBkYXRlZCA9IHVzZXJNYW5hZ2VyLnVwZGF0ZVBlcm1pc3Npb25zKG5hbWUsIGRiLmZyb21MaW51eFN0cmluZyhjaGFuZ2VzLnBlcm0hKSk7XG4gICAgICAgICAgaWYgKCFwZXJtVXBkYXRlZCkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICAgICAgICAgIHJlcy5lbmQoYGNvdWxkIG5vdCB1cGRhdGUgcGVybWlzc2lvbnMgZm9yICR7bmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgICAgICByZXMuZW5kKGB1c2VyICR7bmFtZX0gdXBkYXRlZGApO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgICAgICByZXMuZW5kKGBpbnZhbGlkIGpzb246ICR7KGUgYXMgRXJyb3IpLm1lc3NhZ2V9YCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqIEt1bGxhbsSxY8SxIEFQSSdzaW5pIGJhxZ9sYXQgKHRlayBzZWZlcmxpayB5YXJkxLFtY8SxIGZvbmtzaXlvbikgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydFVzZXJBcGkoZnRwU2VydmVyOiBGdHBTZXJ2ZXIsIHBvcnQgPSAzMDAxKTogUHJvbWlzZTxVc2VyQXBpPiB7XG4gIGNvbnN0IGFwaSA9IG5ldyBVc2VyQXBpKHsgZnRwU2VydmVyLCBwb3J0IH0pO1xuICBhd2FpdCBhcGkuc3RhcnQoKTtcbiAgcmV0dXJuIGFwaTtcbn0iXX0=