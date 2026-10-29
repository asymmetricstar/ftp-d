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
exports.buildDirectoryListing = buildDirectoryListing;
exports.handleList = handleList;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function buildDirectoryListing(directory) {
    const files = await fs.promises.readdir(directory, { withFileTypes: true });
    files.sort((a, b) => a.name.localeCompare(b.name));
    let output = '';
    for (const file of files) {
        const filePath = path.join(directory, file.name);
        const stat = await fs.promises.stat(filePath).catch(() => null);
        const perms = file.isDirectory() ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = file.isDirectory() ? '4096' : stat ? stat.size.toString() : '0';
        output += `${perms} 1 admin admin ${size} Oct 29 00:00 ${file.name}\r\n`;
    }
    return output;
}
async function handleList(connId, conn, userManager, controlSocket) {
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const directoryResolved = path.resolve(conn.currentDir);
        if (!(0, pathUtils_1.isPathWithinHome)(directoryResolved, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot list outside home directory`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'list')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: LIST`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const output = await buildDirectoryListing(directoryResolved);
        conn.lastReply = types_1.ReplyCode.DATA_CONNECT;
        conn.lastMessage = `Opening DATA connection for LIST`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        console.log(`[FtpServer] LIST: ${conn.user} - ${directoryResolved}`);
        return { code: conn.lastReply, message: conn.lastMessage, data: { output, directory: directoryResolved } };
    }
    catch (error) {
        console.error(`[FtpServer] LIST komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGlzdENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvTGlzdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLElBQUksaUNBQWE7QUFDN0Isb0NBQW1FO0FBRW5FLGtEQUFzRDtBQU8vQyxLQUFLLGdDQUFnQyxTQUFpQjtJQUMzRCxNQUFNLEtBQUssR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVuRCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDaEIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN6QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztRQUMvRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFB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QWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsTUFBTSxHQUFHLEdBQUcsS0FBYyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRywwQkFBMEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNELGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgaXNQYXRoV2l0aGluSG9tZSB9IGZyb20gJy4uL3V0aWxzL3BhdGhVdGlscyc7XG5cbi8qKlxuICogRGl6aW4gbGlzdGVzaW5pIFJGQyA5NTkgTElTVCBmb3JtYXTEsW5kYSBoYXrEsXJsYTpcbiAqICAgLXJ3LXItLXItLSAxIGFkbWluIGFkbWluIDQwOTYgT2N0IDI5IDAwOjAwIGRvc3lhLnR4dFxuICogKERpemluIHTDvHLDvCBpemluIGFsYW7EsW7EsW4gaWxrIGhhcmZpbmRlbiBhbmxhxZ/EsWzEsXIsIGVrIHNhdMSxciB5YXrEsWxtYXouKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVpbGREaXJlY3RvcnlMaXN0aW5nKGRpcmVjdG9yeTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZmlsZXMgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkZGlyKGRpcmVjdG9yeSwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBmaWxlcy5zb3J0KChhLCBiKSA9PiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpKTtcblxuICBsZXQgb3V0cHV0ID0gJyc7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGRpcmVjdG9yeSwgZmlsZS5uYW1lKTtcbiAgICBjb25zdCBzdGF0ID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmaWxlUGF0aCkuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgY29uc3QgcGVybXMgPSBmaWxlLmlzRGlyZWN0b3J5KCkgPyAnZHJ3eHIteHIteCcgOiAnLXJ3LXItLXItLSc7XG4gICAgY29uc3Qgc2l6ZSA9IGZpbGUuaXNEaXJlY3RvcnkoKSA/ICc0MDk2JyA6IHN0YXQgPyBzdGF0LnNpemUudG9TdHJpbmcoKSA6ICcwJztcbiAgICBvdXRwdXQgKz0gYCR7cGVybXN9IDEgYWRtaW4gYWRtaW4gJHtzaXplfSBPY3QgMjkgMDA6MDAgJHtmaWxlLm5hbWV9XFxyXFxuYDtcbiAgfVxuICByZXR1cm4gb3V0cHV0O1xufVxuXG4vKipcbiAqIExJU1Qga29tdXR1bnUgacWfbGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZUxpc3QoY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIHVzZXJNYW5hZ2VyOiBVc2VyTWFuYWdlciwgY29udHJvbFNvY2tldDogYW55KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFjb25uLnVzZXIpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9MT0dHRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYE5vdCBsb2dnZWQgaW5gO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gR8OcVkVOTMSwSzogS3VsbGFuxLFjxLEgc2FkZWNlIGtlbmRpIGhvbWVEaXInaW5lIGVyacWfZWJpbGlyXG4gICAgY29uc3QgZGlyZWN0b3J5UmVzb2x2ZWQgPSBwYXRoLnJlc29sdmUoY29ubi5jdXJyZW50RGlyKTtcbiAgICBpZiAoIWlzUGF0aFdpdGhpbkhvbWUoZGlyZWN0b3J5UmVzb2x2ZWQsIGNvbm4uaG9tZURpcikpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9BTExPV0VEO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBBY2Nlc3MgZGVuaWVkOiBDYW5ub3QgbGlzdCBvdXRzaWRlIGhvbWUgZGlyZWN0b3J5YDtcbiAgICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIMSwemluIGtvbnRyb2zDvFxuICAgIGlmICghdXNlck1hbmFnZXIgfHwgIXVzZXJNYW5hZ2VyLmNoZWNrUGVybWlzc2lvbihjb25uLnVzZXIgfHwgJycsICdsaXN0JykpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PX1BFUk1JU1NJT047XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFBlcm1pc3Npb24gZGVuaWVkOiBMSVNUYDtcbiAgICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IGJ1aWxkRGlyZWN0b3J5TGlzdGluZyhkaXJlY3RvcnlSZXNvbHZlZCk7XG5cbiAgICAvLyAxNTAgeWFuxLF0xLFuxLEga29udHJvbCBzb2NrZXQnZSBnw7ZuZGVyXG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuREFUQV9DT05ORUNUO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgT3BlbmluZyBEQVRBIGNvbm5lY3Rpb24gZm9yIExJU1RgO1xuICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG5cbiAgICBjb25zb2xlLmxvZyhgW0Z0cFNlcnZlcl0gTElTVDogJHtjb25uLnVzZXJ9IC0gJHtkaXJlY3RvcnlSZXNvbHZlZH1gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSwgZGF0YTogeyBvdXRwdXQsIGRpcmVjdG9yeTogZGlyZWN0b3J5UmVzb2x2ZWQgfSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIExJU1Qga29tdXR1IGhhdGFzxLE6YCwgZXJyb3IpO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfVxufVxuIl19