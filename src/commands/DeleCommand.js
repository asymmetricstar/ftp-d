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
exports.handleDele = handleDele;
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleDele(connId, conn, filename, userManager) {
    const socket = conn?.socket;
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'delete')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: DELE`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const filePath = (0, pathUtils_1.resolveFtpPath)(filename, conn.currentDir, conn.homeDir);
        if (!(0, pathUtils_1.isPathWithinHome)(filePath, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot delete outside home directory`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const stat = await fs.promises.stat(filePath).catch(() => null);
        if (!stat || !stat.isFile()) {
            conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
            conn.lastMessage = `No such file or directory: ${filename}`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        await fs.promises.unlink(filePath);
        conn.lastReply = types_1.ReplyCode.DELE_OK;
        conn.lastMessage = `File deleted successfully`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        console.log(`[FtpServer] DELE: ${conn.user} - ${filename}`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        console.error(`[FtpServer] DELE komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVsZUNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvRGVsZUNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxFQUFFLCtCQUFXO0FBRXpCLG9DQUFtRTtBQUVuRSxrREFBc0U7QUFLL0QsS0FBSyxxQkFBcUIsTUFBYyxFQUFFLElBQW1CLEVBQUUsUUFBZ0IsRUFBRSxXQUF3QjtJQUM5RyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQ25DLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxhQUFhLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztZQUM3QyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBQSwwQkFBYyxFQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUd6RSxJQUFJLENBQUMsSUFBQSw0QkFBZ0IsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFdBQVcsQ0FBQztZQUN2QyxJQUFJLENBQUMsV0FBVyxHQUFHLHFEQUFxRCxDQUFDO1lBQ3pFLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLGNBQWMsQ0FBQztZQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLDhCQUE4QixRQUFRLEVBQUUsQ0FBQztZQUM1RCxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsT0FBTyxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsMkJBQTJCLENBQUM7UUFDL0MsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFFM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksTUFBTSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RCxNQUFNLEdBQUcsR0FBRyxLQUFjLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFlBQVksQ0FBQztRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLDBCQUEwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0QsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyByZXNvbHZlRnRwUGF0aCwgaXNQYXRoV2l0aGluSG9tZSB9IGZyb20gJy4uL3V0aWxzL3BhdGhVdGlscyc7XG5cbi8qKlxuICogREVMRSBrb211dHVudSBpxZ9sZSAoZG9zeWEgc2lsKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlRGVsZShjb25uSWQ6IHN0cmluZywgY29ubjogRnRwQ29ubmVjdGlvbiwgZmlsZW5hbWU6IHN0cmluZywgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyKTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgdHJ5IHtcbiAgICBpZiAoIWNvbm4udXNlcikge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0xPR0dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgTm90IGxvZ2dlZCBpbmA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIMSwemluIGtvbnRyb2zDvFxuICAgIGlmICghdXNlck1hbmFnZXIgfHwgIXVzZXJNYW5hZ2VyLmNoZWNrUGVybWlzc2lvbihjb25uLnVzZXIgfHwgJycsICdkZWxldGUnKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IERFTEVgO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlUGF0aCA9IHJlc29sdmVGdHBQYXRoKGZpbGVuYW1lLCBjb25uLmN1cnJlbnREaXIsIGNvbm4uaG9tZURpcik7XG5cbiAgICAvLyBHw5xWRU5MxLBLOiBEb3N5YSBob21lRGlyIGnDp2luZGUgb2xtYWzEsVxuICAgIGlmICghaXNQYXRoV2l0aGluSG9tZShmaWxlUGF0aCwgY29ubi5ob21lRGlyKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0FMTE9XRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYEFjY2VzcyBkZW5pZWQ6IENhbm5vdCBkZWxldGUgb3V0c2lkZSBob21lIGRpcmVjdG9yeWA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBmcy5wcm9taXNlcy5zdGF0KGZpbGVQYXRoKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICBpZiAoIXN0YXQgfHwgIXN0YXQuaXNGaWxlKCkpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkZJTEVfTk9UX0ZPVU5EO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAke2ZpbGVuYW1lfWA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGF3YWl0IGZzLnByb21pc2VzLnVubGluayhmaWxlUGF0aCk7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuREVMRV9PSztcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEZpbGUgZGVsZXRlZCBzdWNjZXNzZnVsbHlgO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcblxuICAgIGNvbnNvbGUubG9nKGBbRnRwU2VydmVyXSBERUxFOiAke2Nvbm4udXNlcn0gLSAke2ZpbGVuYW1lfWApO1xuICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgW0Z0cFNlcnZlcl0gREVMRSBrb211dHUgaGF0YXPEsTpgLCBlcnJvcik7XG4gICAgY29uc3QgZXJyID0gZXJyb3IgYXMgRXJyb3I7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuSU5URVJOQUxfRVJSO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgSW50ZXJuYWwgc2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWA7XG4gICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gIH1cbn1cbiJdfQ==