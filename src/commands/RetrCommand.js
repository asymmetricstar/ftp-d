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
exports.handleRetr = handleRetr;
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleRetr(connId, conn, filename, userManager, controlSocket) {
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'read')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: RETR`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const filePath = (0, pathUtils_1.resolveFtpPath)(filename, conn.currentDir, conn.homeDir);
        if (!(0, pathUtils_1.isPathWithinHome)(filePath, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot download outside home directory`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const stat = await fs.promises.stat(filePath).catch(() => null);
        if (!stat || !stat.isFile()) {
            conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
            conn.lastMessage = `No such file or directory: ${filename}`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        conn.lastReply = types_1.ReplyCode.DATA_CONNECT;
        conn.lastMessage = `Opening DATA connection for RETR`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        logger_1.Logger.info(`[FtpServer] RETR command executed`);
        return { code: conn.lastReply, message: conn.lastMessage, data: { filePath } };
    }
    catch (error) {
        logger_1.Logger.error(`[FtpServer] RETR command error`);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmV0ckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvUmV0ckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQXlDO0FBQ3pDLE1BQVksRUFBRSwrQkFBVztBQUV6QixvQ0FBbUU7QUFFbkUsa0RBQXNFO0FBSy9ELEtBQUsscUJBQXFCLE1BQWMsRUFBRSxJQUFtQixFQUFFLFFBQWdCLEVBQUUsV0FBd0IsRUFBRSxhQUFrQjtJQUNsSSxJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFVBQVUsQ0FBQztZQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztZQUNuQyxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBR0QsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMxRSxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsYUFBYSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcseUJBQXlCLENBQUM7WUFDN0MsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUEsMEJBQWMsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFHekUsSUFBSSxDQUFDLElBQUEsNEJBQWdCLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxXQUFXLENBQUM7WUFDdkMsSUFBSSxDQUFDLFdBQVcsR0FBRyx1REFBdUQsQ0FBQztZQUMzRSxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxjQUFjLENBQUM7WUFDMUMsSUFBSSxDQUFDLFdBQVcsR0FBRyw4QkFBOEIsUUFBUSxFQUFFLENBQUM7WUFDNUQsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUdELElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxrQ0FBa0MsQ0FBQztRQUN0RCxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztRQUVsRSxlQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDakQsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUM7SUFDakYsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixlQUFNLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxHQUFHLEdBQUcsS0FBYyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRywwQkFBMEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNELGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBSZXBseUNvZGUsIEZ0cENvbm5lY3Rpb24sIENvbW1hbmRSZXN1bHQgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBVc2VyTWFuYWdlciB9IGZyb20gJy4uL3VzZXJNYW5hZ2VyJztcbmltcG9ydCB7IHJlc29sdmVGdHBQYXRoLCBpc1BhdGhXaXRoaW5Ib21lIH0gZnJvbSAnLi4vdXRpbHMvcGF0aFV0aWxzJztcblxuLyoqXG4gKiBSRVRSIGtvbXV0dW51IGnFn2xlIChkb3N5YSBpbmRpcilcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVJldHIoY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIGZpbGVuYW1lOiBzdHJpbmcsIHVzZXJNYW5hZ2VyOiBVc2VyTWFuYWdlciwgY29udHJvbFNvY2tldDogYW55KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFjb25uLnVzZXIpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9MT0dHRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYE5vdCBsb2dnZWQgaW5gO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF1c2VyTWFuYWdlciB8fCAhdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ3JlYWQnKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IFJFVFJgO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZVBhdGggPSByZXNvbHZlRnRwUGF0aChmaWxlbmFtZSwgY29ubi5jdXJyZW50RGlyLCBjb25uLmhvbWVEaXIpO1xuXG4gICAgLy8gR8OcVkVOTMSwSzogRG9zeWEgaG9tZURpciBpw6dpbmRlIG9sbWFsxLFcbiAgICBpZiAoIWlzUGF0aFdpdGhpbkhvbWUoZmlsZVBhdGgsIGNvbm4uaG9tZURpcikpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9BTExPV0VEO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBBY2Nlc3MgZGVuaWVkOiBDYW5ub3QgZG93bmxvYWQgb3V0c2lkZSBob21lIGRpcmVjdG9yeWA7XG4gICAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChmaWxlUGF0aCkuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgaWYgKCFzdGF0IHx8ICFzdGF0LmlzRmlsZSgpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5GSUxFX05PVF9GT1VORDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgTm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJHtmaWxlbmFtZX1gO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gMTUwIHlhbsSxdMSxbsSxIGtvbnRyb2wgc29ja2V0J2UgZ8O2bmRlclxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkRBVEFfQ09OTkVDVDtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYE9wZW5pbmcgREFUQSBjb25uZWN0aW9uIGZvciBSRVRSYDtcbiAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuXG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIFJFVFIgY29tbWFuZCBleGVjdXRlZGApO1xuICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlLCBkYXRhOiB7IGZpbGVQYXRoIH0gfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFJFVFIgY29tbWFuZCBlcnJvcmApO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfVxufVxuIl19