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
exports.handleRnto = handleRnto;
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleRnto(connId, conn, newFilename, userManager) {
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
            conn.lastMessage = `Permission denied: RNTO`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const destPath = (0, pathUtils_1.resolveFtpPath)(newFilename, conn.currentDir, conn.homeDir);
        if (!conn.rnfrPath) {
            conn.lastReply = types_1.ReplyCode.BAD_SEQ;
            conn.lastMessage = `RNFR required before RNTO`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!(0, pathUtils_1.isPathWithinHome)(destPath, conn.homeDir) || !(0, pathUtils_1.isPathWithinHome)(conn.rnfrPath, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot rename outside home directory`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const sourcePath = conn.rnfrPath;
        conn.rnfrPath = null;
        try {
            await fs.promises.rename(sourcePath, destPath);
        }
        catch (error) {
            const err = error;
            if (err.code === 'ENOENT') {
                conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
                conn.lastMessage = `No such file or directory: ${newFilename}`;
                socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
                return { code: conn.lastReply, message: conn.lastMessage };
            }
            if (err.code === 'EEXIST' || err.code === 'EPERM') {
                conn.lastReply = types_1.ReplyCode.FILE_EXISTS;
                conn.lastMessage = `Target already exists: ${newFilename}`;
                socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
                return { code: conn.lastReply, message: conn.lastMessage };
            }
            throw error;
        }
        conn.lastReply = types_1.ReplyCode.DELE_OK;
        conn.lastMessage = `File renamed successfully`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        console.log(`[FtpServer] RNTO: ${conn.user} -> ${newFilename}`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        console.error(`[FtpServer] RNTO komutu hatası:`, error);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm50b0NvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvUm50b0NvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxFQUFFLCtCQUFXO0FBRXpCLG9DQUFtRTtBQUVuRSxrREFBc0U7QUFLL0QsS0FBSyxxQkFBcUIsTUFBYyxFQUFFLElBQW1CLEVBQUUsV0FBbUIsRUFBRSxXQUF3QjtJQUNqSCxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxDQUFDO0lBQzVCLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQ25DLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFHRCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxhQUFhLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztZQUM3QyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFB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QUFHLGlCQUFTLENBQUMsT0FBTyxDQUFDO1FBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsMkJBQTJCLENBQUM7UUFDL0MsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFFM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksT0FBTyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RCxNQUFNLEdBQUcsR0FBRyxLQUFjLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFlBQVksQ0FBQztRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLDBCQUEwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0QsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyByZXNvbHZlRnRwUGF0aCwgaXNQYXRoV2l0aGluSG9tZSB9IGZyb20gJy4uL3V0aWxzL3BhdGhVdGlscyc7XG5cbi8qKlxuICogUk5UTyBrb211dHVudSBpxZ9sZSAoeWVuaWRlbiBhZGxhbmTEsXJtYSBoZWRlZilcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVJudG8oY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIG5ld0ZpbGVuYW1lOiBzdHJpbmcsIHVzZXJNYW5hZ2VyOiBVc2VyTWFuYWdlcik6IFByb21pc2U8Q29tbWFuZFJlc3VsdD4ge1xuICBjb25zdCBzb2NrZXQgPSBjb25uPy5zb2NrZXQ7XG4gIHRyeSB7XG4gICAgaWYgKCFjb25uLnVzZXIpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9MT0dHRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYE5vdCBsb2dnZWQgaW5gO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyDEsHppbiBrb250cm9sw7xcbiAgICBpZiAoIXVzZXJNYW5hZ2VyIHx8ICF1c2VyTWFuYWdlci5jaGVja1Blcm1pc3Npb24oY29ubi51c2VyIHx8ICcnLCAncmVuYW1lJykpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PX1BFUk1JU1NJT047XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFBlcm1pc3Npb24gZGVuaWVkOiBSTlRPYDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgY29uc3QgZGVzdFBhdGggPSByZXNvbHZlRnRwUGF0aChuZXdGaWxlbmFtZSwgY29ubi5jdXJyZW50RGlyLCBjb25uLmhvbWVEaXIpO1xuXG4gICAgLy8gUk5GUiB2ZXJpbG1lbWnFnyBvbGFiaWxpclxuICAgIGlmICghY29ubi5ybmZyUGF0aCkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuQkFEX1NFUTtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUk5GUiByZXF1aXJlZCBiZWZvcmUgUk5UT2A7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIEfDnFZFTkzEsEs6IEtheW5hayB2ZSBoZWRlZiBob21lRGlyIGnDp2luZGUgb2xtYWzEsVxuICAgIGlmICghaXNQYXRoV2l0aGluSG9tZShkZXN0UGF0aCwgY29ubi5ob21lRGlyKSB8fCAhaXNQYXRoV2l0aGluSG9tZShjb25uLnJuZnJQYXRoLCBjb25uLmhvbWVEaXIpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT1RfQUxMT1dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgQWNjZXNzIGRlbmllZDogQ2Fubm90IHJlbmFtZSBvdXRzaWRlIGhvbWUgZGlyZWN0b3J5YDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlUGF0aCA9IGNvbm4ucm5mclBhdGg7XG4gICAgY29ubi5ybmZyUGF0aCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFJORlIgaWxlIGJlbGlydGlsZW4ga2F5bmHEn8SxLCBSTlRPJ2Rha2kgaGVkZWZlIHRhxZ/EsVxuICAgICAgYXdhaXQgZnMucHJvbWlzZXMucmVuYW1lKHNvdXJjZVBhdGgsIGRlc3RQYXRoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgZXJyID0gZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uO1xuICAgICAgaWYgKGVyci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5GSUxFX05PVF9GT1VORDtcbiAgICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAke25ld0ZpbGVuYW1lfWA7XG4gICAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICAgIH1cbiAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VFWElTVCcgfHwgZXJyLmNvZGUgPT09ICdFUEVSTScpIHtcbiAgICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuRklMRV9FWElTVFM7XG4gICAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgVGFyZ2V0IGFscmVhZHkgZXhpc3RzOiAke25ld0ZpbGVuYW1lfWA7XG4gICAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICAgIH1cbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkRFTEVfT0s7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBGaWxlIHJlbmFtZWQgc3VjY2Vzc2Z1bGx5YDtcbiAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG5cbiAgICBjb25zb2xlLmxvZyhgW0Z0cFNlcnZlcl0gUk5UTzogJHtjb25uLnVzZXJ9IC0+ICR7bmV3RmlsZW5hbWV9YCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBbRnRwU2VydmVyXSBSTlRPIGtvbXV0dSBoYXRhc8SxOmAsIGVycm9yKTtcbiAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBFcnJvcjtcbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5JTlRFUk5BTF9FUlI7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBJbnRlcm5hbCBzZXJ2ZXIgZXJyb3I6ICR7ZXJyLm1lc3NhZ2V9YDtcbiAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgfVxufVxuIl19