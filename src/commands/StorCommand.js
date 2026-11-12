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
exports.handleStor = handleStor;
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleStor(connId, conn, filename, userManager, controlSocket) {
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'write')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: STOR`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const filePath = (0, pathUtils_1.resolveFtpPath)(filename, conn.currentDir, conn.homeDir);
        if (!(0, pathUtils_1.isPathWithinHome)(filePath, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot upload outside home directory`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const dirPath = path.dirname(filePath);
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            const err = error;
            if (err.code !== 'EEXIST') {
                logger_1.Logger.error(`[FtpServer] STOR directory creation error`);
            }
        }
        conn.lastReply = types_1.ReplyCode.DATA_CONNECT;
        conn.lastMessage = `Opening DATA connection for STOR`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        logger_1.Logger.info(`[FtpServer] STOR: ${conn.user} - ${filename} -> ${filePath}`);
        return { code: conn.lastReply, message: conn.lastMessage, data: { filePath } };
    }
    catch (error) {
        logger_1.Logger.error(`[FtpServer] STOR command error`);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RvckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvU3RvckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQXlDO0FBQ3pDLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLElBQUksaUNBQWE7QUFDN0Isb0NBQW1FO0FBRW5FLGtEQUFzRTtBQUsvRCxLQUFLLHFCQUFxQixNQUFjLEVBQUUsSUFBbUIsRUFBRSxRQUFnQixFQUFFLFdBQXdCLEVBQUUsYUFBa0I7SUFDbEksSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxVQUFVLENBQUM7WUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUM7WUFDbkMsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUdELElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLGFBQWEsQ0FBQztZQUN6QyxJQUFJLENBQUMsV0FBVyxHQUFHLHlCQUF5QixDQUFDO1lBQzdDLGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFBLDBCQUFjLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBR3pFLElBQUksQ0FBQyxJQUFBLDRCQUFnQixFQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsV0FBVyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxXQUFXLEdBQUcscURBQXFELENBQUM7WUFDekUsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUdELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUVmLE1BQU0sR0FBRyxHQUFHLEtBQThCLENBQUM7WUFDM0MsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMxQixlQUFNLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7WUFDNUQsQ0FBQztRQUNILENBQUM7UUFHRCxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsWUFBWSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsa0NBQWtDLENBQUM7UUFDdEQsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFFbEUsZUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksTUFBTSxRQUFRLE9BQU8sUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztJQUNqRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLGVBQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUMvQyxNQUFNLEdBQUcsR0FBRyxLQUFjLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFlBQVksQ0FBQztRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLDBCQUEwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0QsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tICcuLi91dGlscy9sb2dnZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgcmVzb2x2ZUZ0cFBhdGgsIGlzUGF0aFdpdGhpbkhvbWUgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuXG4vKipcbiAqIFNUT1Iga29tdXR1bnUgacWfbGUgKGRvc3lhIHnDvGtsZSlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVN0b3IoY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIGZpbGVuYW1lOiBzdHJpbmcsIHVzZXJNYW5hZ2VyOiBVc2VyTWFuYWdlciwgY29udHJvbFNvY2tldDogYW55KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFjb25uLnVzZXIpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9MT0dHRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYE5vdCBsb2dnZWQgaW5gO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF1c2VyTWFuYWdlciB8fCAhdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ3dyaXRlJykpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PX1BFUk1JU1NJT047XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFBlcm1pc3Npb24gZGVuaWVkOiBTVE9SYDtcbiAgICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVQYXRoID0gcmVzb2x2ZUZ0cFBhdGgoZmlsZW5hbWUsIGNvbm4uY3VycmVudERpciwgY29ubi5ob21lRGlyKTtcblxuICAgIC8vIEfDnFZFTkzEsEs6IERvc3lhIGhvbWVEaXIgacOnaW5kZSBvbG1hbMSxXG4gICAgaWYgKCFpc1BhdGhXaXRoaW5Ib21lKGZpbGVQYXRoLCBjb25uLmhvbWVEaXIpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT1RfQUxMT1dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgQWNjZXNzIGRlbmllZDogQ2Fubm90IHVwbG9hZCBvdXRzaWRlIGhvbWUgZGlyZWN0b3J5YDtcbiAgICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIERpemluIHZhcmzEscSfxLFuZGFuIGVtaW4gb2xcbiAgICBjb25zdCBkaXJQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIoZGlyUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIFphdGVuIHZhcnNhIGhhdGEgdmVybWV6XG4gICAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb247XG4gICAgICBpZiAoZXJyLmNvZGUgIT09ICdFRVhJU1QnKSB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gU1RPUiBkaXJlY3RvcnkgY3JlYXRpb24gZXJyb3JgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAxNTAgeWFuxLF0xLFuxLEga29udHJvbCBzb2NrZXQnZSBnw7ZuZGVyXG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuREFUQV9DT05ORUNUO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgT3BlbmluZyBEQVRBIGNvbm5lY3Rpb24gZm9yIFNUT1JgO1xuICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG5cbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gU1RPUjogJHtjb25uLnVzZXJ9IC0gJHtmaWxlbmFtZX0gLT4gJHtmaWxlUGF0aH1gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSwgZGF0YTogeyBmaWxlUGF0aCB9IH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBTVE9SIGNvbW1hbmQgZXJyb3JgKTtcbiAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBFcnJvcjtcbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5JTlRFUk5BTF9FUlI7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YDtcbiAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gIH1cbn1cbiJdfQ==