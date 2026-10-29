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
                console.error(`[FtpServer] STOR dizin oluşturma hatası:`, err);
            }
        }
        conn.lastReply = types_1.ReplyCode.DATA_CONNECT;
        conn.lastMessage = `Opening DATA connection for STOR`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        console.log(`[FtpServer] STOR: ${conn.user} - ${filename} -> ${filePath}`);
        return { code: conn.lastReply, message: conn.lastMessage, data: { filePath } };
    }
    catch (error) {
        console.error(`[FtpServer] STOR komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RvckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvU3RvckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxFQUFFLCtCQUFXO0FBQ3pCLE1BQVksSUFBSSxpQ0FBYTtBQUM3QixvQ0FBbUU7QUFFbkUsa0RBQXNFO0FBSy9ELEtBQUsscUJBQXFCLE1BQWMsRUFBRSxJQUFtQixFQUFFLFFBQWdCLEVBQUUsV0FBd0IsRUFBRSxhQUFrQjtJQUNsSSxJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFVBQVUsQ0FBQztZQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztZQUNuQyxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBR0QsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMzRSxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsYUFBYSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcseUJBQXlCLENBQUM7WUFDN0MsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUEsMEJBQWMsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFHekUsSUFBSSxDQUFDLElBQUEsNEJBQWdCLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxXQUFXLENBQUM7WUFDdkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxxREFBcUQsQ0FBQztZQUN6RSxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBR0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUM7WUFDSCxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBRWYsTUFBTSxHQUFHLEdBQUcsS0FBOEIsQ0FBQztZQUMzQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsMENBQTBDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDakUsQ0FBQztRQUNILENBQUM7UUFHRCxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsWUFBWSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsa0NBQWtDLENBQUM7UUFDdEQsYUFBYSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFFbEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksTUFBTSxRQUFRLE9BQU8sUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztJQUNqRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsTUFBTSxHQUFHLEdBQUcsS0FBYyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRywwQkFBMEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNELGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgcmVzb2x2ZUZ0cFBhdGgsIGlzUGF0aFdpdGhpbkhvbWUgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuXG4vKipcbiAqIFNUT1Iga29tdXR1bnUgacWfbGUgKGRvc3lhIHnDvGtsZSlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVN0b3IoY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIGZpbGVuYW1lOiBzdHJpbmcsIHVzZXJNYW5hZ2VyOiBVc2VyTWFuYWdlciwgY29udHJvbFNvY2tldDogYW55KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIHRyeSB7XG4gICAgaWYgKCFjb25uLnVzZXIpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9MT0dHRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYE5vdCBsb2dnZWQgaW5gO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF1c2VyTWFuYWdlciB8fCAhdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ3dyaXRlJykpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PX1BFUk1JU1NJT047XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFBlcm1pc3Npb24gZGVuaWVkOiBTVE9SYDtcbiAgICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVQYXRoID0gcmVzb2x2ZUZ0cFBhdGgoZmlsZW5hbWUsIGNvbm4uY3VycmVudERpciwgY29ubi5ob21lRGlyKTtcblxuICAgIC8vIEfDnFZFTkzEsEs6IERvc3lhIGhvbWVEaXIgacOnaW5kZSBvbG1hbMSxXG4gICAgaWYgKCFpc1BhdGhXaXRoaW5Ib21lKGZpbGVQYXRoLCBjb25uLmhvbWVEaXIpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT1RfQUxMT1dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgQWNjZXNzIGRlbmllZDogQ2Fubm90IHVwbG9hZCBvdXRzaWRlIGhvbWUgZGlyZWN0b3J5YDtcbiAgICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIERpemluIHZhcmzEscSfxLFuZGFuIGVtaW4gb2xcbiAgICBjb25zdCBkaXJQYXRoID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIoZGlyUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIFphdGVuIHZhcnNhIGhhdGEgdmVybWV6XG4gICAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb247XG4gICAgICBpZiAoZXJyLmNvZGUgIT09ICdFRVhJU1QnKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIFNUT1IgZGl6aW4gb2x1xZ90dXJtYSBoYXRhc8SxOmAsIGVycik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gMTUwIHlhbsSxdMSxbsSxIGtvbnRyb2wgc29ja2V0J2UgZ8O2bmRlclxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkRBVEFfQ09OTkVDVDtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYE9wZW5pbmcgREFUQSBjb25uZWN0aW9uIGZvciBTVE9SYDtcbiAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuXG4gICAgY29uc29sZS5sb2coYFtGdHBTZXJ2ZXJdIFNUT1I6ICR7Y29ubi51c2VyfSAtICR7ZmlsZW5hbWV9IC0+ICR7ZmlsZVBhdGh9YCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UsIGRhdGE6IHsgZmlsZVBhdGggfSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIFNUT1Iga29tdXR1IGhhdGFzxLE6YCwgZXJyb3IpO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfVxufVxuIl19