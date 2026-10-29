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
            console.error(`[FtpServer] User not found: ${username}`);
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
        console.log(`[FtpServer] User logged in: ${username} (${connId})`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        console.error(`[FtpServer] USER command error`);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvVXNlckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsTUFBWSxJQUFJLGlDQUFhO0FBQzdCLG9DQUFtRTtBQUVuRSxrREFBMkQ7QUFLcEQsS0FBSyxxQkFBcUIsTUFBYyxFQUFFLElBQW1CLEVBQUUsUUFBZ0IsRUFBRSxXQUF3QjtJQUM5RyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUVILElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsWUFBWSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsb0RBQW9ELENBQUM7WUFDeEUsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7WUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsUUFBUSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxRQUFRLGdCQUFnQixDQUFDO1lBQ3BELE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDNUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztRQUkxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQztRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLGVBQWUsQ0FBQztRQUVsQyxNQUFNLElBQUEsaUNBQXFCLEVBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTdDLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxTQUFTLENBQUM7UUFDckMsSUFBSSxDQUFDLFdBQVcsR0FBRyx5QkFBeUIsUUFBUSxFQUFFLENBQUM7UUFDdkQsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFFM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsUUFBUSxLQUFLLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbkUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDaEQsTUFBTSxHQUFHLEdBQUcsS0FBYyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRywwQkFBMEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNELE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgZW5zdXJlRGlyZWN0b3J5RXhpc3RzIH0gZnJvbSAnLi4vdXRpbHMvcGF0aFV0aWxzJztcblxuLyoqXG4gKiBVU0VSIGtvbXV0dW51IGnFn2xlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVVc2VyKGNvbm5JZDogc3RyaW5nLCBjb25uOiBGdHBDb25uZWN0aW9uLCB1c2VybmFtZTogc3RyaW5nLCB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXIpOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3Qgc29ja2V0ID0gY29ubj8uc29ja2V0O1xuICB0cnkge1xuICAgIC8vIEt1bGxhbsSxY8SxecSxIGtvbnRyb2wgZXRcbiAgICBpZiAoIXVzZXJNYW5hZ2VyKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5JTlRFUk5BTF9FUlI7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogdXNlck1hbmFnZXIgbm90IGluaXRpYWxpemVkYDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuICAgIGNvbnN0IHVzZXIgPSB1c2VyTWFuYWdlci5maW5kVXNlcih1c2VybmFtZSk7XG5cbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuQkFEX1VTRVI7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFVzZXIgJHt1c2VybmFtZX0gbm90IGxvZ2dlZCBpbmA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIEt1bGxhbsSxY8SxIGJpbGdpbGVyaW5pIGtheWRldFxuICAgIGNvbm4udXNlciA9IHVzZXJuYW1lO1xuICAgIGNvbm4uaG9tZURpciA9IHVzZXIuaG9tZURpcjtcbiAgICBjb25uLnBlcm1pc3Npb25zID0gdXNlci5wZXJtaXNzaW9ucyB8fCB7fTtcblxuICAgIC8vIEt1bGxhbsSxY8SxIGRpemluaW5pIGF5YXJsYVxuICAgIC8vIGhvbWVEaXInaSBtdXRsYWsgaGFsZSBnZXRpclxuICAgIGNvbnN0IGhvbWVEaXJBYnNvbHV0ZSA9IHBhdGgucmVzb2x2ZSh1c2VyLmhvbWVEaXIpO1xuICAgIGNvbm4uaG9tZURpciA9IGhvbWVEaXJBYnNvbHV0ZTtcbiAgICBjb25uLmN1cnJlbnREaXIgPSBob21lRGlyQWJzb2x1dGU7XG4gICAgXG4gICAgYXdhaXQgZW5zdXJlRGlyZWN0b3J5RXhpc3RzKGNvbm4uY3VycmVudERpcik7XG5cbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5VU0VSX1BBU1M7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQYXNzd29yZCByZXF1aXJlZCBmb3IgJHt1c2VybmFtZX1gO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcblxuICAgIGNvbnNvbGUubG9nKGBbRnRwU2VydmVyXSBVc2VyIGxvZ2dlZCBpbjogJHt1c2VybmFtZX0gKCR7Y29ubklkfSlgKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYFtGdHBTZXJ2ZXJdIFVTRVIgY29tbWFuZCBlcnJvcmApO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9XG59XG4iXX0=