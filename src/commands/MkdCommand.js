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
exports.handleMkd = handleMkd;
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleMkd(connId, conn, dirPath, userManager) {
    const socket = conn?.socket;
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'mkd')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: MKD`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const targetDir = (0, pathUtils_1.resolveFtpPath)(dirPath, conn.currentDir, conn.homeDir);
        if (!(0, pathUtils_1.isPathWithinHome)(targetDir, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot create directory outside home directory`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        try {
            await fs.promises.mkdir(targetDir, { recursive: true });
        }
        catch (error) {
            const err = error;
            if (err.code === 'EEXIST') {
                conn.lastReply = types_1.ReplyCode.DIRECTORY_EXISTS;
                conn.lastMessage = `Directory already exists: ${dirPath}`;
                socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
                return { code: conn.lastReply, message: conn.lastMessage };
            }
            if (err.code === 'ENOENT') {
                conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
                conn.lastMessage = `No such parent directory: ${dirPath}`;
                socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
                return { code: conn.lastReply, message: conn.lastMessage };
            }
            throw error;
        }
        const normalizedDir = (0, pathUtils_1.toVirtualPath)(targetDir, conn.homeDir);
        conn.lastReply = types_1.ReplyCode.MKD_OK;
        conn.lastMessage = `"${normalizedDir}" directory created`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        console.log(`[FtpServer] MKD: ${conn.user} -> ${targetDir}`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        console.error(`[FtpServer] MKD komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWtkQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tYW5kcy9Na2RDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUV6QixvQ0FBbUU7QUFFbkUsa0RBQXFGO0FBSzlFLEtBQUssb0JBQW9CLE1BQWMsRUFBRSxJQUFtQixFQUFFLE9BQWUsRUFBRSxXQUF3QjtJQUM1RyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQ25DLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxhQUFhLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyx3QkFBd0IsQ0FBQztZQUM1QyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFBSSxF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S0FBSyxDQUFDLENBQUM7UUFDdkQsTUFBTSxHQUFHLEdBQUcsS0FBYyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRywwQkFBMEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNELE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgcmVzb2x2ZUZ0cFBhdGgsIHRvVmlydHVhbFBhdGgsIGlzUGF0aFdpdGhpbkhvbWUgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuXG4vKipcbiAqIE1LRCBrb211dHVudSBpxZ9sZSAoZGl6aW4gb2x1xZ90dXIpXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVNa2QoY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIGRpclBhdGg6IHN0cmluZywgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyKTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgdHJ5IHtcbiAgICBpZiAoIWNvbm4udXNlcikge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0xPR0dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgTm90IGxvZ2dlZCBpbmA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIMSwemluIGtvbnRyb2zDvFxuICAgIGlmICghdXNlck1hbmFnZXIgfHwgIXVzZXJNYW5hZ2VyLmNoZWNrUGVybWlzc2lvbihjb25uLnVzZXIgfHwgJycsICdta2QnKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IE1LRGA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldERpciA9IHJlc29sdmVGdHBQYXRoKGRpclBhdGgsIGNvbm4uY3VycmVudERpciwgY29ubi5ob21lRGlyKTtcblxuICAgIC8vIEfDnFZFTkzEsEs6IFllbmkgZGl6aW4gaG9tZURpciBpw6dpbmRlIG9sbWFsxLFcbiAgICBpZiAoIWlzUGF0aFdpdGhpbkhvbWUodGFyZ2V0RGlyLCBjb25uLmhvbWVEaXIpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT1RfQUxMT1dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgQWNjZXNzIGRlbmllZDogQ2Fubm90IGNyZWF0ZSBkaXJlY3Rvcnkgb3V0c2lkZSBob21lIGRpcmVjdG9yeWA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmcy5wcm9taXNlcy5ta2Rpcih0YXJnZXREaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb247XG4gICAgICBpZiAoZXJyLmNvZGUgPT09ICdFRVhJU1QnKSB7XG4gICAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkRJUkVDVE9SWV9FWElTVFM7XG4gICAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgRGlyZWN0b3J5IGFscmVhZHkgZXhpc3RzOiAke2RpclBhdGh9YDtcbiAgICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgICAgfVxuICAgICAgaWYgKGVyci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5GSUxFX05PVF9GT1VORDtcbiAgICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBObyBzdWNoIHBhcmVudCBkaXJlY3Rvcnk6ICR7ZGlyUGF0aH1gO1xuICAgICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBjb25zdCBub3JtYWxpemVkRGlyID0gdG9WaXJ0dWFsUGF0aCh0YXJnZXREaXIsIGNvbm4uaG9tZURpcik7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTUtEX09LO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgXCIke25vcm1hbGl6ZWREaXJ9XCIgZGlyZWN0b3J5IGNyZWF0ZWRgO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcblxuICAgIGNvbnNvbGUubG9nKGBbRnRwU2VydmVyXSBNS0Q6ICR7Y29ubi51c2VyfSAtPiAke3RhcmdldERpcn1gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIE1LRCBrb211dHUgaGF0YXPEsTpgLCBlcnJvcik7XG4gICAgY29uc3QgZXJyID0gZXJyb3IgYXMgRXJyb3I7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuSU5URVJOQUxfRVJSO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgSW50ZXJuYWwgc2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWA7XG4gICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gIH1cbn1cbiJdfQ==