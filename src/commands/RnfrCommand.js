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
exports.handleRnfr = handleRnfr;
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleRnfr(connId, conn, filename, userManager) {
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
            conn.lastMessage = `Permission denied: RNFR`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const sourcePath = (0, pathUtils_1.resolveFtpPath)(filename, conn.currentDir, conn.homeDir);
        if (!(0, pathUtils_1.isPathWithinHome)(sourcePath, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot rename outside home directory`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const stat = await fs.promises.stat(sourcePath).catch(() => null);
        if (!stat) {
            conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
            conn.lastMessage = `No such file or directory: ${filename}`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        conn.rnfrPath = sourcePath;
        conn.lastReply = types_1.ReplyCode.REST_OK;
        conn.lastMessage = `Please specify the new name`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        console.log(`[FtpServer] RNFR: ${conn.user} -> ${filename}`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        console.error(`[FtpServer] RNFR komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm5mckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvUm5mckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxFQUFFLCtCQUFXO0FBRXpCLG9DQUFtRTtBQUVuRSxrREFBc0U7QUFLL0QsS0FBSyxxQkFBcUIsTUFBYyxFQUFFLElBQW1CLEVBQUUsUUFBZ0IsRUFBRSxXQUF3QjtJQUM5RyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQ25DLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxhQUFhLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztZQUM3QyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBQSwwQkFBYyxFQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUczRSxJQUFJLENBQUMsSUFBQSw0QkFBZ0IsRUFBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFdBQVcsQ0FBQztZQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLHFEQUFxRCxDQUFDO1lBQ3pFLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsY0FBYyxDQUFDO1lBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsOEJBQThCLFFBQVEsRUFBRSxDQUFDO1lBQzVELE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsT0FBTyxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsNkJBQTZCLENBQUM7UUFDakQsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFFM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksT0FBTyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RCxNQUFNLEdBQUcsR0FBRyxLQUFjLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFlBQVksQ0FBQztRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLDBCQUEwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0QsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyByZXNvbHZlRnRwUGF0aCwgaXNQYXRoV2l0aGluSG9tZSB9IGZyb20gJy4uL3V0aWxzL3BhdGhVdGlscyc7XG5cbi8qKlxuICogUk5GUiBrb211dHVudSBpxZ9sZSAoeWVuaWRlbiBhZGxhbmTEsXJtYSBrYXluYWspXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVSbmZyKGNvbm5JZDogc3RyaW5nLCBjb25uOiBGdHBDb25uZWN0aW9uLCBmaWxlbmFtZTogc3RyaW5nLCB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXIpOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICB0cnkge1xuICAgIGlmICghY29ubi51c2VyKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT1RfTE9HR0VEO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBOb3QgbG9nZ2VkIGluYDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF1c2VyTWFuYWdlciB8fCAhdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ3JlbmFtZScpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT19QRVJNSVNTSU9OO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQZXJtaXNzaW9uIGRlbmllZDogUk5GUmA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVBhdGggPSByZXNvbHZlRnRwUGF0aChmaWxlbmFtZSwgY29ubi5jdXJyZW50RGlyLCBjb25uLmhvbWVEaXIpO1xuXG4gICAgLy8gR8OcVkVOTMSwSzogS2F5bmFrIGhvbWVEaXIgacOnaW5kZSBvbG1hbMSxXG4gICAgaWYgKCFpc1BhdGhXaXRoaW5Ib21lKHNvdXJjZVBhdGgsIGNvbm4uaG9tZURpcikpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9BTExPV0VEO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBBY2Nlc3MgZGVuaWVkOiBDYW5ub3QgcmVuYW1lIG91dHNpZGUgaG9tZSBkaXJlY3RvcnlgO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdChzb3VyY2VQYXRoKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICBpZiAoIXN0YXQpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkZJTEVfTk9UX0ZPVU5EO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAke2ZpbGVuYW1lfWA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIFJORlIgYmHFn2FyxLFsxLEsIFJOVE8gYmVrbGl5b3I6IGtheW5hxJ/EsSBoYXTEsXJsYVxuICAgIGNvbm4ucm5mclBhdGggPSBzb3VyY2VQYXRoO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLlJFU1RfT0s7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQbGVhc2Ugc3BlY2lmeSB0aGUgbmV3IG5hbWVgO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcblxuICAgIGNvbnNvbGUubG9nKGBbRnRwU2VydmVyXSBSTkZSOiAke2Nvbm4udXNlcn0gLT4gJHtmaWxlbmFtZX1gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIFJORlIga29tdXR1IGhhdGFzxLE6YCwgZXJyb3IpO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9XG59XG4iXX0=