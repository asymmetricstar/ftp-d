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
        console.log(`[FtpServer] RETR: ${conn.user} - ${filename}`);
        return { code: conn.lastReply, message: conn.lastMessage, data: { filePath } };
    }
    catch (error) {
        console.error(`[FtpServer] RETR komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmV0ckNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvUmV0ckNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxFQUFFLCtCQUFXO0FBRXpCLG9DQUFtRTtBQUVuRSxrREFBc0U7QUFLL0QsS0FBSyxxQkFBcUIsTUFBYyxFQUFFLElBQW1CLEVBQUUsUUFBZ0IsRUFBRSxXQUF3QixFQUFFLGFBQWtCO0lBQ2xJLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQ25DLGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxhQUFhLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztZQUM3QyxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBQSwwQkFBYyxFQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUd6RSxJQUFJLENBQUMsSUFBQSw0QkFBZ0IsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFdBQVcsQ0FBQztZQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLHVEQUF1RCxDQUFDO1lBQzNFLGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLGNBQWMsQ0FBQztZQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLDhCQUE4QixRQUFRLEVBQUUsQ0FBQztZQUM1RCxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBR0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFlBQVksQ0FBQztRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLGtDQUFrQyxDQUFDO1FBQ3RELGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBRWxFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLE1BQU0sUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztJQUNqRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsTUFBTSxHQUFHLEdBQUcsS0FBYyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRywwQkFBMEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNELGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFJlcGx5Q29kZSwgRnRwQ29ubmVjdGlvbiwgQ29tbWFuZFJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi4vdXNlck1hbmFnZXInO1xuaW1wb3J0IHsgcmVzb2x2ZUZ0cFBhdGgsIGlzUGF0aFdpdGhpbkhvbWUgfSBmcm9tICcuLi91dGlscy9wYXRoVXRpbHMnO1xuXG4vKipcbiAqIFJFVFIga29tdXR1bnUgacWfbGUgKGRvc3lhIGluZGlyKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmV0cihjb25uSWQ6IHN0cmluZywgY29ubjogRnRwQ29ubmVjdGlvbiwgZmlsZW5hbWU6IHN0cmluZywgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyLCBjb250cm9sU29ja2V0OiBhbnkpOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICBpZiAoIWNvbm4udXNlcikge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0xPR0dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgTm90IGxvZ2dlZCBpbmA7XG4gICAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyDEsHppbiBrb250cm9sw7xcbiAgICBpZiAoIXVzZXJNYW5hZ2VyIHx8ICF1c2VyTWFuYWdlci5jaGVja1Blcm1pc3Npb24oY29ubi51c2VyIHx8ICcnLCAncmVhZCcpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT19QRVJNSVNTSU9OO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQZXJtaXNzaW9uIGRlbmllZDogUkVUUmA7XG4gICAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlUGF0aCA9IHJlc29sdmVGdHBQYXRoKGZpbGVuYW1lLCBjb25uLmN1cnJlbnREaXIsIGNvbm4uaG9tZURpcik7XG5cbiAgICAvLyBHw5xWRU5MxLBLOiBEb3N5YSBob21lRGlyIGnDp2luZGUgb2xtYWzEsVxuICAgIGlmICghaXNQYXRoV2l0aGluSG9tZShmaWxlUGF0aCwgY29ubi5ob21lRGlyKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0FMTE9XRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYEFjY2VzcyBkZW5pZWQ6IENhbm5vdCBkb3dubG9hZCBvdXRzaWRlIGhvbWUgZGlyZWN0b3J5YDtcbiAgICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBmcy5wcm9taXNlcy5zdGF0KGZpbGVQYXRoKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICBpZiAoIXN0YXQgfHwgIXN0YXQuaXNGaWxlKCkpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkZJTEVfTk9UX0ZPVU5EO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAke2ZpbGVuYW1lfWA7XG4gICAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyAxNTAgeWFuxLF0xLFuxLEga29udHJvbCBzb2NrZXQnZSBnw7ZuZGVyXG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuREFUQV9DT05ORUNUO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgT3BlbmluZyBEQVRBIGNvbm5lY3Rpb24gZm9yIFJFVFJgO1xuICAgIGNvbnRyb2xTb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG5cbiAgICBjb25zb2xlLmxvZyhgW0Z0cFNlcnZlcl0gUkVUUjogJHtjb25uLnVzZXJ9IC0gJHtmaWxlbmFtZX1gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSwgZGF0YTogeyBmaWxlUGF0aCB9IH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgW0Z0cFNlcnZlcl0gUkVUUiBrb211dHUgaGF0YXPEsTpgLCBlcnJvcik7XG4gICAgY29uc3QgZXJyID0gZXJyb3IgYXMgRXJyb3I7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuSU5URVJOQUxfRVJSO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgSW50ZXJuYWwgc2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWA7XG4gICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9XG59XG4iXX0=