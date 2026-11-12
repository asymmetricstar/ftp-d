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
exports.buildDirectoryListing = buildDirectoryListing;
exports.handleList = handleList;
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function buildDirectoryListing(directory) {
    const files = await fs.promises.readdir(directory, { withFileTypes: true });
    files.sort((a, b) => a.name.localeCompare(b.name));
    let output = '';
    for (const file of files) {
        const filePath = path.join(directory, file.name);
        const stat = await fs.promises.stat(filePath).catch(() => null);
        const perms = file.isDirectory() ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = file.isDirectory() ? '4096' : stat ? stat.size.toString() : '0';
        output += `${perms} 1 admin admin ${size} Oct 29 00:00 ${file.name}\r\n`;
    }
    return output;
}
async function handleList(connId, conn, userManager, controlSocket) {
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const directoryResolved = path.resolve(conn.currentDir);
        if (!(0, pathUtils_1.isPathWithinHome)(directoryResolved, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot list outside home directory`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'list')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: LIST`;
            controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const output = await buildDirectoryListing(directoryResolved);
        conn.lastReply = types_1.ReplyCode.DATA_CONNECT;
        conn.lastMessage = `Opening DATA connection for LIST`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        logger_1.Logger.info(`[FtpServer] LIST command executed`);
        return { code: conn.lastReply, message: conn.lastMessage, data: { output, directory: directoryResolved } };
    }
    catch (error) {
        logger_1.Logger.error(`[FtpServer] LIST command error`);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        controlSocket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGlzdENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvTGlzdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUF5QztBQUN6QyxNQUFZLEVBQUUsK0JBQVc7QUFDekIsTUFBWSxJQUFJLGlDQUFhO0FBQzdCLG9DQUFtRTtBQUVuRSxrREFBc0Q7QUFPL0MsS0FBSyxnQ0FBZ0MsU0FBaUI7SUFDM0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM1RSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFbkQsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFDL0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMs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LE1BQU0sR0FBRyxHQUFHLEtBQWMsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsWUFBWSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsMEJBQTBCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzRCxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztRQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUM3RCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyBpc1BhdGhXaXRoaW5Ib21lIH0gZnJvbSAnLi4vdXRpbHMvcGF0aFV0aWxzJztcblxuLyoqXG4gKiBEaXppbiBsaXN0ZXNpbmkgUkZDIDk1OSBMSVNUIGZvcm1hdMSxbmRhIGhhesSxcmxhOlxuICogICAtcnctci0tci0tIDEgYWRtaW4gYWRtaW4gNDA5NiBPY3QgMjkgMDA6MDAgZG9zeWEudHh0XG4gKiAoRGl6aW4gdMO8csO8IGl6aW4gYWxhbsSxbsSxbiBpbGsgaGFyZmluZGVuIGFubGHFn8SxbMSxciwgZWsgc2F0xLFyIHlhesSxbG1hei4pXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZERpcmVjdG9yeUxpc3RpbmcoZGlyZWN0b3J5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmaWxlcyA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRkaXIoZGlyZWN0b3J5LCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gIGZpbGVzLnNvcnQoKGEsIGIpID0+IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpO1xuXG4gIGxldCBvdXRwdXQgPSAnJztcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oZGlyZWN0b3J5LCBmaWxlLm5hbWUpO1xuICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBmcy5wcm9taXNlcy5zdGF0KGZpbGVQYXRoKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICBjb25zdCBwZXJtcyA9IGZpbGUuaXNEaXJlY3RvcnkoKSA/ICdkcnd4ci14ci14JyA6ICctcnctci0tci0tJztcbiAgICBjb25zdCBzaXplID0gZmlsZS5pc0RpcmVjdG9yeSgpID8gJzQwOTYnIDogc3RhdCA/IHN0YXQuc2l6ZS50b1N0cmluZygpIDogJzAnO1xuICAgIG91dHB1dCArPSBgJHtwZXJtc30gMSBhZG1pbiBhZG1pbiAke3NpemV9IE9jdCAyOSAwMDowMCAke2ZpbGUubmFtZX1cXHJcXG5gO1xuICB9XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbi8qKlxuICogTElTVCBrb211dHVudSBpxZ9sZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlTGlzdChjb25uSWQ6IHN0cmluZywgY29ubjogRnRwQ29ubmVjdGlvbiwgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyLCBjb250cm9sU29ja2V0OiBhbnkpOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgdHJ5IHtcbiAgICBpZiAoIWNvbm4udXNlcikge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0xPR0dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgTm90IGxvZ2dlZCBpbmA7XG4gICAgICBjb250cm9sU29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyBHw5xWRU5MxLBLOiBLdWxsYW7EsWPEsSBzYWRlY2Uga2VuZGkgaG9tZURpcidpbmUgZXJpxZ9lYmlsaXJcbiAgICBjb25zdCBkaXJlY3RvcnlSZXNvbHZlZCA9IHBhdGgucmVzb2x2ZShjb25uLmN1cnJlbnREaXIpO1xuICAgIGlmICghaXNQYXRoV2l0aGluSG9tZShkaXJlY3RvcnlSZXNvbHZlZCwgY29ubi5ob21lRGlyKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0FMTE9XRUQ7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYEFjY2VzcyBkZW5pZWQ6IENhbm5vdCBsaXN0IG91dHNpZGUgaG9tZSBkaXJlY3RvcnlgO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF1c2VyTWFuYWdlciB8fCAhdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ2xpc3QnKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IExJU1RgO1xuICAgICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgYnVpbGREaXJlY3RvcnlMaXN0aW5nKGRpcmVjdG9yeVJlc29sdmVkKTtcblxuICAgIC8vIDE1MCB5YW7EsXTEsW7EsSBrb250cm9sIHNvY2tldCdlIGfDtm5kZXJcbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5EQVRBX0NPTk5FQ1Q7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBPcGVuaW5nIERBVEEgY29ubmVjdGlvbiBmb3IgTElTVGA7XG4gICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcblxuICAgIExvZ2dlci5pbmZvKGBbRnRwU2VydmVyXSBMSVNUIGNvbW1hbmQgZXhlY3V0ZWRgKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSwgZGF0YTogeyBvdXRwdXQsIGRpcmVjdG9yeTogZGlyZWN0b3J5UmVzb2x2ZWQgfSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gTElTVCBjb21tYW5kIGVycm9yYCk7XG4gICAgY29uc3QgZXJyID0gZXJyb3IgYXMgRXJyb3I7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuSU5URVJOQUxfRVJSO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgSW50ZXJuYWwgc2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWA7XG4gICAgY29udHJvbFNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9XG59XG4iXX0=