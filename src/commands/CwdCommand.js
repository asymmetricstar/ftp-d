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
exports.handleCwd = handleCwd;
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleCwd(connId, conn, dirPath, userManager) {
    const socket = conn?.socket;
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!dirPath || dirPath.trim() === '') {
            conn.lastReply = types_1.ReplyCode.SYNTAX_ERR;
            conn.lastMessage = `Syntax error in CWD command`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const targetDirResolved = (0, pathUtils_1.resolveFtpPath)(dirPath, conn.currentDir, conn.homeDir);
        if (!(0, pathUtils_1.isPathWithinHome)(targetDirResolved, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot navigate outside home directory`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'list')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: CWD`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const stat = await fs.promises.stat(targetDirResolved).catch(() => null);
        if (!stat || !stat.isDirectory()) {
            conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
            conn.lastMessage = `No such file or directory: ${dirPath}`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        conn.currentDir = targetDirResolved;
        conn.lastReply = types_1.ReplyCode.CWD_OK;
        conn.lastMessage = `CWD command successful`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        console.log(`[FtpServer] CWD: ${conn.user} -> ${conn.currentDir}`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        console.error(`[FtpServer] CWD komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3dkQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tYW5kcy9Dd2RDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixvQ0FBbUU7QUFFbkUsa0RBQXNFO0FBSy9ELEtBQUssb0JBQW9CLE1BQWMsRUFBRSxJQUFtQixFQUFFLE9BQWUsRUFBRSxXQUF3QjtJQUM1RyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQ25DLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsNkJBQTZCLENBQUM7WUFDakQsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJ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QUFJLENBQUMsV0FBVyxHQUFHLDBCQUEwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0QsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBSZXBseUNvZGUsIEZ0cENvbm5lY3Rpb24sIENvbW1hbmRSZXN1bHQgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBVc2VyTWFuYWdlciB9IGZyb20gJy4uL3VzZXJNYW5hZ2VyJztcbmltcG9ydCB7IHJlc29sdmVGdHBQYXRoLCBpc1BhdGhXaXRoaW5Ib21lIH0gZnJvbSAnLi4vdXRpbHMvcGF0aFV0aWxzJztcblxuLyoqXG4gKiBDV0Qga29tdXR1bnUgacWfbGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZUN3ZChjb25uSWQ6IHN0cmluZywgY29ubjogRnRwQ29ubmVjdGlvbiwgZGlyUGF0aDogc3RyaW5nLCB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXIpOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICB0cnkge1xuICAgIGlmICghY29ubi51c2VyKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT1RfTE9HR0VEO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBOb3QgbG9nZ2VkIGluYDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgaWYgKCFkaXJQYXRoIHx8IGRpclBhdGgudHJpbSgpID09PSAnJykge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuU1lOVEFYX0VSUjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgU3ludGF4IGVycm9yIGluIENXRCBjb21tYW5kYDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gQ1dEIHlvbHVudSDDp8O2ejpcbiAgICAvLyAtIE11dGxhayBXaW5kb3dzIHlvbHUgKEM6XFxVc2Vyc1xcLi4uXFxOZXcgZGlyZWN0b3J5KSBkb3N5YSBzaXN0ZW1pIHlvbHVcbiAgICAvLyAtIE11dGxhayBQT1NJWCB5b2x1ICgvTmV3IGRpcmVjdG9yeSkgaG9tZURpciBrw7ZrbMO8IHNhbmFsIHlvbFxuICAgIC8vIC0gR8O2cmVsaSB5b2wgKE5ldyBkaXJlY3RvcnksIC4uKSBjdXJyZW50RGlyIMO8emVyaW5kZW5cbiAgICBjb25zdCB0YXJnZXREaXJSZXNvbHZlZCA9IHJlc29sdmVGdHBQYXRoKGRpclBhdGgsIGNvbm4uY3VycmVudERpciwgY29ubi5ob21lRGlyKTtcblxuICAgIC8vIEfDnFZFTkzEsEs6IEt1bGxhbsSxY8SxIHNhZGVjZSBrZW5kaSBob21lRGlyJ2luZSBlcmnFn2ViaWxpclxuICAgIGlmICghaXNQYXRoV2l0aGluSG9tZSh0YXJnZXREaXJSZXNvbHZlZCwgY29ubi5ob21lRGlyKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0FMTE9XRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYEFjY2VzcyBkZW5pZWQ6IENhbm5vdCBuYXZpZ2F0ZSBvdXRzaWRlIGhvbWUgZGlyZWN0b3J5YDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF1c2VyTWFuYWdlciB8fCAhdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ2xpc3QnKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IENXRGA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIERpemluIHZhciBtxLEga29udHJvbCBldFxuICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBmcy5wcm9taXNlcy5zdGF0KHRhcmdldERpclJlc29sdmVkKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICBpZiAoIXN0YXQgfHwgIXN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuRklMRV9OT1RfRk9VTkQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYE5vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICR7ZGlyUGF0aH1gO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyBjdXJyZW50RGlyIGhlciB6YW1hbiBkb3N5YSBzaXN0ZW1pIG11dGxhayB5b2x1IG9sYXJhayBzYWtsYW7EsXJcbiAgICBjb25uLmN1cnJlbnREaXIgPSB0YXJnZXREaXJSZXNvbHZlZDtcbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5DV0RfT0s7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBDV0QgY29tbWFuZCBzdWNjZXNzZnVsYDtcbiAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG5cbiAgICBjb25zb2xlLmxvZyhgW0Z0cFNlcnZlcl0gQ1dEOiAke2Nvbm4udXNlcn0gLT4gJHtjb25uLmN1cnJlbnREaXJ9YCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBbRnRwU2VydmVyXSBDV0Qga29tdXR1IGhhdGFzxLE6YCwgZXJyb3IpO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9XG59XG4iXX0=