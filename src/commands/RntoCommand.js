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
exports.handleRnto = handleRnto;
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleRnto(connId, conn, newFilename, userManager) {
    const socket = conn?.socket;
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'rename')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: RNTO`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const destPath = (0, pathUtils_1.resolveFtpPath)(newFilename, conn.currentDir, conn.homeDir);
        if (!conn.rnfrPath) {
            conn.lastReply = types_1.ReplyCode.BAD_SEQ;
            conn.lastMessage = `RNFR required before RNTO`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!(0, pathUtils_1.isPathWithinHome)(destPath, conn.homeDir) || !(0, pathUtils_1.isPathWithinHome)(conn.rnfrPath, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot rename outside home directory`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const sourcePath = conn.rnfrPath;
        conn.rnfrPath = null;
        try {
            await fs.promises.rename(sourcePath, destPath);
        }
        catch (error) {
            const err = error;
            if (err.code === 'ENOENT') {
                conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
                conn.lastMessage = `No such file or directory: ${newFilename}`;
                socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
                return { code: conn.lastReply, message: conn.lastMessage };
            }
            if (err.code === 'EEXIST' || err.code === 'EPERM') {
                conn.lastReply = types_1.ReplyCode.FILE_EXISTS;
                conn.lastMessage = `Target already exists: ${newFilename}`;
                socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
                return { code: conn.lastReply, message: conn.lastMessage };
            }
            throw error;
        }
        conn.lastReply = types_1.ReplyCode.DELE_OK;
        conn.lastMessage = `File renamed successfully`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        logger_1.Logger.info(`[FtpServer] RNTO: ${conn.user} -> ${newFilename}`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        logger_1.Logger.error(`[FtpServer] RNTO command error`);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm50b0NvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvUm50b0NvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQXlDO0FBQ3pDLE1BQVksRUFBRSwrQkFBVztBQUV6QixvQ0FBbUU7QUFFbkUsa0RBQXNFO0FBSy9ELEtBQUsscUJBQXFCLE1BQWMsRUFBRSxJQUFtQixFQUFFLFdBQW1CLEVBQUUsV0FBd0I7SUFDakgsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUM1QixJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFVBQVUsQ0FBQztZQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztZQUNuQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBR0QsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM1RSxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsYUFBYSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcseUJBQXlCLENBQUM7WUFDN0MsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDM0Qs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SSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLE9BQU8sQ0FBQztRQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLDJCQUEyQixDQUFDO1FBQy9DLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBRTNELGVBQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLE9BQU8sV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNoRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUM3RCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLGVBQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUMvQyxNQUFNLEdBQUcsR0FBRyxLQUFjLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFlBQVksQ0FBQztRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLDBCQUEwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0QsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tICcuLi91dGlscy9sb2dnZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgcmVzb2x2ZUZ0cFBhdGgsIGlzUGF0aFdpdGhpbkhvbWUgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuXG4vKipcbiAqIFJOVE8ga29tdXR1bnUgacWfbGUgKHllbmlkZW4gYWRsYW5kxLFybWEgaGVkZWYpXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVSbnRvKGNvbm5JZDogc3RyaW5nLCBjb25uOiBGdHBDb25uZWN0aW9uLCBuZXdGaWxlbmFtZTogc3RyaW5nLCB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXIpOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICB0cnkge1xuICAgIGlmICghY29ubi51c2VyKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT1RfTE9HR0VEO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBOb3QgbG9nZ2VkIGluYDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF1c2VyTWFuYWdlciB8fCAhdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ3JlbmFtZScpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT19QRVJNSVNTSU9OO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQZXJtaXNzaW9uIGRlbmllZDogUk5UT2A7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IGRlc3RQYXRoID0gcmVzb2x2ZUZ0cFBhdGgobmV3RmlsZW5hbWUsIGNvbm4uY3VycmVudERpciwgY29ubi5ob21lRGlyKTtcblxuICAgIC8vIFJORlIgdmVyaWxtZW1pxZ8gb2xhYmlsaXJcbiAgICBpZiAoIWNvbm4ucm5mclBhdGgpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkJBRF9TRVE7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFJORlIgcmVxdWlyZWQgYmVmb3JlIFJOVE9gO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyBHw5xWRU5MxLBLOiBLYXluYWsgdmUgaGVkZWYgaG9tZURpciBpw6dpbmRlIG9sbWFsxLFcbiAgICBpZiAoIWlzUGF0aFdpdGhpbkhvbWUoZGVzdFBhdGgsIGNvbm4uaG9tZURpcikgfHwgIWlzUGF0aFdpdGhpbkhvbWUoY29ubi5ybmZyUGF0aCwgY29ubi5ob21lRGlyKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0FMTE9XRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYEFjY2VzcyBkZW5pZWQ6IENhbm5vdCByZW5hbWUgb3V0c2lkZSBob21lIGRpcmVjdG9yeWA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVBhdGggPSBjb25uLnJuZnJQYXRoO1xuICAgIGNvbm4ucm5mclBhdGggPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICAvLyBSTkZSIGlsZSBiZWxpcnRpbGVuIGtheW5hxJ/EsSwgUk5UTydkYWtpIGhlZGVmZSB0YcWfxLFcbiAgICAgIGF3YWl0IGZzLnByb21pc2VzLnJlbmFtZShzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbjtcbiAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuRklMRV9OT1RfRk9VTkQ7XG4gICAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJHtuZXdGaWxlbmFtZX1gO1xuICAgICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgICB9XG4gICAgICBpZiAoZXJyLmNvZGUgPT09ICdFRVhJU1QnIHx8IGVyci5jb2RlID09PSAnRVBFUk0nKSB7XG4gICAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkZJTEVfRVhJU1RTO1xuICAgICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFRhcmdldCBhbHJlYWR5IGV4aXN0czogJHtuZXdGaWxlbmFtZX1gO1xuICAgICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5ERUxFX09LO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgRmlsZSByZW5hbWVkIHN1Y2Nlc3NmdWxseWA7XG4gICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuXG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFJOVE86ICR7Y29ubi51c2VyfSAtPiAke25ld0ZpbGVuYW1lfWApO1xuICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBSTlRPIGNvbW1hbmQgZXJyb3JgKTtcbiAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBFcnJvcjtcbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5JTlRFUk5BTF9FUlI7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YDtcbiAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfVxufVxuIl19