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
exports.handleCwd = handleCwd;
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const pathUtils_1 = require("../utils/pathUtils");
async function handleCwd(connId, conn, dirPath, userManager) {
    const socket = conn?.socket;
    try {
        if (!conn.user) {
            conn.lastReply = types_1.ReplyCode.NOT_LOGGED;
            conn.lastMessage = `Not logged in`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!dirPath || dirPath.trim() === '') {
            conn.lastReply = types_1.ReplyCode.SYNTAX_ERR;
            conn.lastMessage = `Syntax error in CWD command`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const targetDirResolved = (0, pathUtils_1.resolveFtpPath)(dirPath, conn.currentDir, conn.homeDir);
        if (!(0, pathUtils_1.isPathWithinHome)(targetDirResolved, conn.homeDir)) {
            conn.lastReply = types_1.ReplyCode.NOT_ALLOWED;
            conn.lastMessage = `Access denied: Cannot navigate outside home directory`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        if (!userManager || !userManager.checkPermission(conn.user || '', 'list')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: CWD`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        const stat = await fs.promises.stat(targetDirResolved).catch(() => null);
        if (!stat || !stat.isDirectory()) {
            conn.lastReply = types_1.ReplyCode.FILE_NOT_FOUND;
            conn.lastMessage = `No such file or directory: ${dirPath}`;
            socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
            return { code: conn.lastReply, message: conn.lastMessage };
        }
        conn.currentDir = targetDirResolved;
        conn.lastReply = types_1.ReplyCode.CWD_OK;
        conn.lastMessage = `CWD command successful`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        logger_1.Logger.info(`[FtpServer] CWD: ${conn.user} -> ${conn.currentDir}`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        logger_1.Logger.error(`[FtpServer] CWD command error`);
        const err = error;
        conn.lastReply = types_1.ReplyCode.INTERNAL_ERR;
        conn.lastMessage = `Internal server error: ${err.message}`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3dkQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tYW5kcy9Dd2RDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUF5QztBQUN6QyxNQUFZLEVBQUUsK0JBQVc7QUFDekIsb0NBQW1FO0FBRW5FLGtEQUFzRTtBQUsvRCxLQUFLLG9CQUFvQixNQUFjLEVBQUUsSUFBbUIsRUFBRSxPQUFlLEVBQUUsV0FBd0I7SUFDNUcsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUM1QixJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFVBQVUsQ0FBQztZQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztZQUNuQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLFVBQVUsQ0FBQztZQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLDZCQUE2QixDQUFDO1lBQ2pELE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFB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QyxJQUFJLENBQUMsV0FBVyxHQUFHLDBCQUEwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0QsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dnZXIgfSBmcm9tICcuLi91dGlscy9sb2dnZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgUmVwbHlDb2RlLCBGdHBDb25uZWN0aW9uLCBDb21tYW5kUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuLi91c2VyTWFuYWdlcic7XG5pbXBvcnQgeyByZXNvbHZlRnRwUGF0aCwgaXNQYXRoV2l0aGluSG9tZSB9IGZyb20gJy4uL3V0aWxzL3BhdGhVdGlscyc7XG5cbi8qKlxuICogQ1dEIGtvbXV0dW51IGnFn2xlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVDd2QoY29ubklkOiBzdHJpbmcsIGNvbm46IEZ0cENvbm5lY3Rpb24sIGRpclBhdGg6IHN0cmluZywgdXNlck1hbmFnZXI6IFVzZXJNYW5hZ2VyKTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgdHJ5IHtcbiAgICBpZiAoIWNvbm4udXNlcikge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9UX0xPR0dFRDtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgTm90IGxvZ2dlZCBpbmA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIGlmICghZGlyUGF0aCB8fCBkaXJQYXRoLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLlNZTlRBWF9FUlI7XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFN5bnRheCBlcnJvciBpbiBDV0QgY29tbWFuZGA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIENXRCB5b2x1bnUgw6fDtno6XG4gICAgLy8gLSBNdXRsYWsgV2luZG93cyB5b2x1IChDOlxcVXNlcnNcXC4uLlxcTmV3IGRpcmVjdG9yeSkgZG9zeWEgc2lzdGVtaSB5b2x1XG4gICAgLy8gLSBNdXRsYWsgUE9TSVggeW9sdSAoL05ldyBkaXJlY3RvcnkpIGhvbWVEaXIga8O2a2zDvCBzYW5hbCB5b2xcbiAgICAvLyAtIEfDtnJlbGkgeW9sIChOZXcgZGlyZWN0b3J5LCAuLikgY3VycmVudERpciDDvHplcmluZGVuXG4gICAgY29uc3QgdGFyZ2V0RGlyUmVzb2x2ZWQgPSByZXNvbHZlRnRwUGF0aChkaXJQYXRoLCBjb25uLmN1cnJlbnREaXIsIGNvbm4uaG9tZURpcik7XG5cbiAgICAvLyBHw5xWRU5MxLBLOiBLdWxsYW7EsWPEsSBzYWRlY2Uga2VuZGkgaG9tZURpcidpbmUgZXJpxZ9lYmlsaXJcbiAgICBpZiAoIWlzUGF0aFdpdGhpbkhvbWUodGFyZ2V0RGlyUmVzb2x2ZWQsIGNvbm4uaG9tZURpcikpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PVF9BTExPV0VEO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBBY2Nlc3MgZGVuaWVkOiBDYW5ub3QgbmF2aWdhdGUgb3V0c2lkZSBob21lIGRpcmVjdG9yeWA7XG4gICAgICBzb2NrZXQ/LndyaXRlKGAke2Nvbm4ubGFzdFJlcGx5fSAke2Nvbm4ubGFzdE1lc3NhZ2V9XFxyXFxuYCk7XG4gICAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICAgIH1cblxuICAgIC8vIMSwemluIGtvbnRyb2zDvFxuICAgIGlmICghdXNlck1hbmFnZXIgfHwgIXVzZXJNYW5hZ2VyLmNoZWNrUGVybWlzc2lvbihjb25uLnVzZXIgfHwgJycsICdsaXN0JykpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PX1BFUk1JU1NJT047XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFBlcm1pc3Npb24gZGVuaWVkOiBDV0RgO1xuICAgICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29ubi5sYXN0UmVwbHksIG1lc3NhZ2U6IGNvbm4ubGFzdE1lc3NhZ2UgfTtcbiAgICB9XG5cbiAgICAvLyBEaXppbiB2YXIgbcSxIGtvbnRyb2wgZXRcbiAgICBjb25zdCBzdGF0ID0gYXdhaXQgZnMucHJvbWlzZXMuc3RhdCh0YXJnZXREaXJSZXNvbHZlZCkuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgaWYgKCFzdGF0IHx8ICFzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkZJTEVfTk9UX0ZPVU5EO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBObyBzdWNoIGZpbGUgb3IgZGlyZWN0b3J5OiAke2RpclBhdGh9YDtcbiAgICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gICAgfVxuXG4gICAgLy8gY3VycmVudERpciBoZXIgemFtYW4gZG9zeWEgc2lzdGVtaSBtdXRsYWsgeW9sdSBvbGFyYWsgc2FrbGFuxLFyXG4gICAgY29ubi5jdXJyZW50RGlyID0gdGFyZ2V0RGlyUmVzb2x2ZWQ7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuQ1dEX09LO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgQ1dEIGNvbW1hbmQgc3VjY2Vzc2Z1bGA7XG4gICAgc29ja2V0Py53cml0ZShgJHtjb25uLmxhc3RSZXBseX0gJHtjb25uLmxhc3RNZXNzYWdlfVxcclxcbmApO1xuXG4gICAgTG9nZ2VyLmluZm8oYFtGdHBTZXJ2ZXJdIENXRDogJHtjb25uLnVzZXJ9IC0+ICR7Y29ubi5jdXJyZW50RGlyfWApO1xuICAgIHJldHVybiB7IGNvZGU6IGNvbm4ubGFzdFJlcGx5LCBtZXNzYWdlOiBjb25uLmxhc3RNZXNzYWdlIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgTG9nZ2VyLmVycm9yKGBbRnRwU2VydmVyXSBDV0QgY29tbWFuZCBlcnJvcmApO1xuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLklOVEVSTkFMX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEludGVybmFsIHNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9XG59XG4iXX0=