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
            console.error(`[FtpServer] Kullanıcı bulunamadı: ${username}`);
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
        console.log(`[FtpServer] Kullanıcı giriş yaptı: ${username} (${connId})`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        console.error(`[FtpServer] USER komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvVXNlckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsTUFBWSxJQUFJLGlDQUFhO0FBQzdCLG9DQUFtRTtBQUVuRSxrREFBMkQ7QUFLcEQsS0FBSyxxQkFBcUIsTUFBYyxFQUFFLElBQW1CLEVBQUUsUUFBZ0IsRUFBRSxXQUF3QjtJQUM5RyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUVILElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsWUFBWSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsb0RBQW9ELENBQUM7WUFDeEUsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMvRCxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsUUFBUSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxRQUFRLGdCQUFnQixDQUFDO1lBQ3BELE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztRQUkxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQztRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQztRQUVsQyxNQUFNLElBQUEsaUNBQXFCLEVBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTdDLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxTQUFTLENBQUM7UUFDckMsSUFBSSxDQUFDLFdBQVcsR0FBRyx5QkFBeUIsUUFBUSxFQUFFLENBQUM7UUFDdkQsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFFM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsUUFBUSxLQUFLLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDMUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hELE1BQU0sR0FBRyxHQUFHLEtBQWMsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsWUFBWSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsMEJBQTBCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzRCxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztRQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUM3RCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5pbXBvcnQgeyBVc2VyTWFuYWdlciB9IGZyb20gJy4uL3VzZXJNYW5hZ2VyJztcclxuaW1wb3J0IHsgZW5zdXJlRGlyZWN0b3J5RXhpc3RzIH0gZnJvbSAnLi4vdXRpbHMvcGF0aFV0aWxzJztcclxuXHJcbi8qKlxyXG4gKiBVU0VSIGtvbXV0dW51IGnFn2xlXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlVXNlcihjb25uSWQ6IHN0cmluZywgY29ubjogRnRwQ29ubmVjdGlvbiwgdXNlcm5hbWU6IHN0cmluZywgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyKTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XHJcbiAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xyXG4gIHRyeSB7XHJcbiAgICAvLyBLdWxsYW7EsWPEsXnEsSBrb250cm9sIGV0XHJcbiAgICBpZiAoIXVzZXJNYW5hZ2VyKSB7XHJcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcclxuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3I6IHVzZXJNYW5hZ2VyIG5vdCBpbml0aWFsaXplZGA7XHJcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcclxuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcclxuICAgIH1cclxuICAgIGNvbnN0IHVzZXIgPSB1c2VyTWFuYWdlci5maW5kVXNlcih1c2VybmFtZSk7XHJcblxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIEt1bGxhbsSxY8SxIGJ1bHVuYW1hZMSxOiAke3VzZXJuYW1lfWApO1xyXG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5CQURfVVNFUjtcclxuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBVc2VyICR7dXNlcm5hbWV9IG5vdCBsb2dnZWQgaW5gO1xyXG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XHJcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gS3VsbGFuxLFjxLEgYmlsZ2lsZXJpbmkga2F5ZGV0XHJcbiAgICBjb25uLnVzZXIgPSB1c2VybmFtZTtcclxuICAgIGNvbm4uaG9tZURpciA9IHVzZXIuaG9tZURpcjtcclxuICAgIGNvbm4ucGVybWlzc2lvbnMgPSB1c2VyLnBlcm1pc3Npb25zIHx8IHt9O1xyXG5cclxuICAgIC8vIEt1bGxhbsSxY8SxIGRpemluaW5pIGF5YXJsYVxyXG4gICAgLy8gaG9tZURpcidpIG11dGxhayBoYWxlIGdldGlyXHJcbiAgICBjb25zdCBob21lRGlyQWJzb2x1dGUgPSBwYXRoLnJlc29sdmUodXNlci5ob21lRGlyKTtcclxuICAgIGNvbm4uaG9tZURpciA9IGhvbWVEaXJBYnNvbHV0ZTtcclxuICAgIGNvbm4uY3VycmVudERpciA9IGhvbWVEaXJBYnNvbHV0ZTtcclxuICAgIFxyXG4gICAgYXdhaXQgZW5zdXJlRGlyZWN0b3J5RXhpc3RzKGNvbm4uY3VycmVudERpcik7XHJcblxyXG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuVVNFUl9QQVNTO1xyXG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQYXNzd29yZCByZXF1aXJlZCBmb3IgJHt1c2VybmFtZX1gO1xyXG4gICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbRnRwU2VydmVyXSBLdWxsYW7EsWPEsSBnaXJpxZ8geWFwdMSxOiAke3VzZXJuYW1lfSAoJHtjb25uSWR9KWApO1xyXG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgW0Z0cFNlcnZlcl0gVVNFUiBrb211dHUgaGF0YXPEsTpgLCBlcnJvcik7XHJcbiAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBFcnJvcjtcclxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcclxuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgSW50ZXJuYWwgc2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWA7XHJcbiAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XHJcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xyXG4gIH1cclxufVxyXG4iXX0=