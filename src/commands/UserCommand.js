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
exports.handleUser = handleUser;
const logger_1 = require("../utils/logger");
const path = __importStar(require("path"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleUser(connId, conn, username, userManager) {
    const socket = conn?.socket;
    try {
        if (!userManager) {
            conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
            conn.lastMessage = `Internal server error: userManager not initialized`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const user = userManager.findUser(username);
        if (!user) {
            logger_1.Logger.error(`[FtpServer] User not found: ${username}`);
            conn.lastReply = types_1.ReplyCode.BAD_USER;
            conn.lastMessage = `User ${username} not logged in`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        conn.user = username;
        conn.homeDir = user.homeDir;
        conn.permissions = user.permissions || {};
        const homeDirAbsolute = path.resolve(user.homeDir);
        conn.homeDir = homeDirAbsolute;
        conn.currentDir = homeDirAbsolute;
        await (0, pathUtils_1.ensureDirectoryExists)(conn.currentDir);
        conn.lastReply = types_1.ReplyCode.USER_PASS;
        conn.lastMessage = `Password required for ${username}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        logger_1.Logger.info(`[FtpServer] User logged in: ${username} (${connId})`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        logger_1.Logger.error(`[FtpServer] USER command error`);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvVXNlckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQXlDO0FBRXpDLE1BQVksSUFBSSxpQ0FBYTtBQUM3QixvQ0FBbUU7QUFFbkUsa0RBQTJEO0FBS3BELEtBQUsscUJBQXFCLE1BQWMsRUFBRSxJQUFtQixFQUFFLFFBQWdCLEVBQUUsV0FBd0I7SUFDOUcsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUM1QixJQUFJLENBQUM7UUFFSCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFlBQVksQ0FBQztZQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLG9EQUFvRCxDQUFDO1lBQ3hFLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLGVBQU0sQ0FBQyxLQUFLLENBQUMsK0JBQStCLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFFBQVEsQ0FBQztZQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsUUFBUSxnQkFBZ0IsQ0FBQztZQUNwRCxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBR0QsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzVCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUM7UUFJMUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLE9BQU8sR0FBRyxlQUFlLENBQUM7UUFDL0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQUM7UUFFbEMsTUFBTSxJQUFBLGlDQUFxQixFQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU3QyxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsU0FBUyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxXQUFXLEdBQUcseUJBQXlCLFFBQVEsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBRTNELGVBQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLFFBQVEsS0FBSyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsZUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sR0FBRyxHQUFHLEtBQWMsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsWUFBWSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsMEJBQTBCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzRCxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztRQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUM3RCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyBlbnN1cmVEaXJlY3RvcnlFeGlzdHMgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuXG4vKipcbiAqIFVTRVIga29tdXR1bnUgacWfbGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVVzZXIoY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIHVzZXJuYW1lOiBzdHJpbmcsIHVzZXJNYW5hZ2VyOiBVc2VyTWFuYWdlcik6IFByb21pc2U8Q29tbWFuZFJlc3VsdD4ge1xuICBjb25zdCBzb2NrZXQgPSBjb25uPy5zb2NrZXQ7XG4gIHRyeSB7XG4gICAgLy8gS3VsbGFuxLFjxLF5xLEga29udHJvbCBldFxuICAgIGlmICghdXNlck1hbmFnZXIpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgSW50ZXJuYWwgc2VydmVyIGVycm9yOiB1c2VyTWFuYWdlciBub3QgaW5pdGlhbGl6ZWRgO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG4gICAgY29uc3QgdXNlciA9IHVzZXJNYW5hZ2VyLmZpbmRVc2VyKHVzZXJuYW1lKTtcblxuICAgIGlmICghdXNlcikge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkJBRF9VU0VSO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBVc2VyICR7dXNlcm5hbWV9IG5vdCBsb2dnZWQgaW5gO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyBLdWxsYW7EsWPEsSBiaWxnaWxlcmluaSBrYXlkZXRcbiAgICBjb25uLnVzZXIgPSB1c2VybmFtZTtcbiAgICBjb25uLmhvbWVEaXIgPSB1c2VyLmhvbWVEaXI7XG4gICAgY29ubi5wZXJtaXNzaW9ucyA9IHVzZXIucGVybWlzc2lvbnMgfHwge307XG5cbiAgICAvLyBLdWxsYW7EsWPEsSBkaXppbmluaSBheWFybGFcbiAgICAvLyBob21lRGlyJ2kgbXV0bGFrIGhhbGUgZ2V0aXJcbiAgICBjb25zdCBob21lRGlyQWJzb2x1dGUgPSBwYXRoLnJlc29sdmUodXNlci5ob21lRGlyKTtcbiAgICBjb25uLmhvbWVEaXIgPSBob21lRGlyQWJzb2x1dGU7XG4gICAgY29ubi5jdXJyZW50RGlyID0gaG9tZURpckFic29sdXRlO1xuICAgIFxuICAgIGF3YWl0IGVuc3VyZURpcmVjdG9yeUV4aXN0cyhjb25uLmN1cnJlbnREaXIpO1xuXG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuVVNFUl9QQVNTO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGFzc3dvcmQgcmVxdWlyZWQgZm9yICR7dXNlcm5hbWV9YDtcbiAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG5cbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gVXNlciBsb2dnZWQgaW46ICR7dXNlcm5hbWV9ICgke2Nvbm5JZH0pYCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBMb2dnZXIuZXJyb3IoYFtGdHBTZXJ2ZXJdIFVTRVIgY29tbWFuZCBlcnJvcmApO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9XG59XG4iXX0=