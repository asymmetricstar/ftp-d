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
exports.fileTransfer = exports.FileTransfer = void 0;
const path = __importStar(require("path"));
const types_1 = require("./types");
const userManager_1 = require("./userManager");
class FileTransfer {
    constructor() {
        this.userManager = null;
    }
    getUserManager() {
        if (!this.userManager) {
            this.userManager = global.__userManager ||
                new userManager_1.UserManager(path.join(__dirname, '../users.json'));
        }
        return this.userManager;
    }
    checkPermission(user, permission) {
        return true;
    }
    async uploadFile(conn, remotePath, data) {
        console.log(`[FileTransfer] Dosya yükleme: ${conn.user || 'unknown'} - ${remotePath}`);
        if (!this.userManager.checkPermission(conn.user || '', 'write')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: upload`;
        }
        conn.lastReply = types_1.ReplyCode.CMD_ERR;
        conn.lastMessage = `Command not yet implemented: STOR`;
    }
    async downloadFile(conn, remotePath) {
        console.log(`[FileTransfer] Dosya indirme: ${conn.user || 'unknown'} - ${remotePath}`);
        if (!this.userManager.checkPermission(conn.user || '', 'read')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: download`;
        }
        conn.lastReply = types_1.ReplyCode.CMD_ERR;
        conn.lastMessage = `Command not yet implemented: RETR`;
    }
    async deleteFile(conn, remotePath) {
        console.log(`[FileTransfer] Dosya silme: ${conn.user || 'unknown'} - ${remotePath}`);
        if (!this.userManager.checkPermission(conn.user || '', 'delete')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: delete`;
        }
        conn.lastReply = types_1.ReplyCode.CMD_ERR;
        conn.lastMessage = `Command not yet implemented: DELE`;
    }
    async createDirectory(conn, remotePath) {
        console.log(`[FileTransfer] Dizin oluşturma: ${conn.user || 'unknown'} - ${remotePath}`);
        if (!this.userManager.checkPermission(conn.user || '', 'mkd')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: create directory`;
        }
        conn.lastReply = types_1.ReplyCode.CMD_ERR;
        conn.lastMessage = `Command not yet implemented: MKD`;
    }
    async removeDirectory(conn, remotePath) {
        console.log(`[FileTransfer] Dizin silme: ${conn.user || 'unknown'} - ${remotePath}`);
        if (!this.userManager.checkPermission(conn.user || '', 'rmdir')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: remove directory`;
        }
        conn.lastReply = types_1.ReplyCode.CMD_ERR;
        conn.lastMessage = `Command not yet implemented: RMD`;
    }
    async renameFile(conn, oldPath, newPath) {
        console.log(`[FileTransfer] Dosya yeniden adlandırma: ${conn.user || 'unknown'} - ${oldPath} -> ${newPath}`);
        if (!this.userManager.checkPermission(conn.user || '', 'rename')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: rename`;
        }
        conn.lastReply = types_1.ReplyCode.CMD_ERR;
        conn.lastMessage = `Command not yet implemented: RNFR/RNTO`;
    }
    async changeFileMode(conn, remotePath, mode) {
        console.log(`[FileTransfer] Dosya izinleri değiştirme: ${conn.user || 'unknown'} - ${remotePath}`);
        if (!this.userManager.checkPermission(conn.user || '', 'chmod')) {
            conn.lastReply = types_1.ReplyCode.NO_PERMISSION;
            conn.lastMessage = `Permission denied: chmod`;
        }
        conn.lastReply = types_1.ReplyCode.CMD_ERR;
        conn.lastMessage = `Command not yet implemented: CHMOD`;
    }
}
exports.FileTransfer = FileTransfer;
exports.fileTransfer = new FileTransfer();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVRyYW5zZmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2ZpbGVUcmFuc2Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxNQUFZLElBQUksaUNBQWE7QUFDN0IsbUNBQW1EO0FBQ25ELCtDQUE0QztBQUs1QztJQUdFO1FBRUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFXLENBQUM7SUFDakMsQ0FBQztJQUtPLGNBQWM7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUV0QixJQUFJLENBQUMsV0FBVyxHQUFJLE1BQWMsQ0FBQyxhQUFhO2dCQUM5QyxJQUFJLHlCQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQzFCLENBQUM7SUFLTyxlQUFlLENBQUMsSUFBWSxFQUFFLFVBQWtCO1FBRXRELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUtNLEtBQUssQ0FBQyxVQUFVLENBQ3JCLElBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLElBQVk7UUFFWixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxJQUFJLENBQUMsSUFBSSxJQUFJLFNBQVMsTUFBTSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBR3ZGLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2hFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxhQUFhLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRywyQkFBMkIsQ0FBQztRQUNqRCxDQUFDO1FBR0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLE9B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QUksQ0FBQyxJQUFJLElBQUksU0FBUyxNQUFNLE9BQU8sT0FBTyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRzdHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxhQUFhLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRywyQkFBMkIsQ0FBQztRQUNqRCxDQUFDO1FBR0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxpQkFBUyxDQUFDLE9BQU8sQ0FBQztRQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLHdDQUF3QyxDQUFDO0lBQzlELENBQUM7SUFLTSxLQUFLLENBQUMsY0FBYyxDQUN6QixJQUFtQixFQUNuQixVQUFrQixFQUNsQixJQUFZO1FBRVosT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsSUFBSSxDQUFDLElBQUksSUFBSSxTQUFTLE1BQU0sVUFBVSxFQUFFLENBQUMsQ0FBQztRQUduRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNoRSxJQUFJLENBQUMsU0FBUyxHQUFHLGlCQUFTLENBQUMsYUFBYSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcsMEJBQTBCLENBQUM7UUFDaEQsQ0FBQztRQUdELElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxPQUFPLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxvQ0FBb0MsQ0FBQztJQUMxRCxDQUFDO0NBQ0Y7O0FBR1ksUUFBQSxZQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBSZXBseUNvZGUsIEZ0cENvbm5lY3Rpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFVzZXJNYW5hZ2VyIH0gZnJvbSAnLi91c2VyTWFuYWdlcic7XG5cbi8qKlxuICogRmlsZVRyYW5zZmVyIC0gRG9zeWEgdHJhbnNmZXIgacWfbGVtbGVyaVxuICovXG5leHBvcnQgY2xhc3MgRmlsZVRyYW5zZmVyIHtcbiAgcHJpdmF0ZSB1c2VyTWFuYWdlcjogVXNlck1hbmFnZXI7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gRMO2bmfDvCBiYcSfxLFtbMSxbMSxxJ/EsW5kYW4ga2HDp8Sxbm1hayBpw6dpbiBsYXp5IGluaXRcbiAgICB0aGlzLnVzZXJNYW5hZ2VyID0gbnVsbCBhcyBhbnk7XG4gIH1cblxuICAvKipcbiAgICogVXNlck1hbmFnZXIgc2luZ2xldG9uJ8SxbsSxIGFsXG4gICAqL1xuICBwcml2YXRlIGdldFVzZXJNYW5hZ2VyKCk6IFVzZXJNYW5hZ2VyIHtcbiAgICBpZiAoIXRoaXMudXNlck1hbmFnZXIpIHtcbiAgICAgIC8vIETDtm5nw7wgYmHEn8SxbWzEsWzEscSfxLFuxLEgw6fDtnptZWsgacOnaW4gZ2xvYmFsIGluc3RhbmNlIGt1bGxhblxuICAgICAgdGhpcy51c2VyTWFuYWdlciA9IChnbG9iYWwgYXMgYW55KS5fX3VzZXJNYW5hZ2VyIHx8IFxuICAgICAgICBuZXcgVXNlck1hbmFnZXIocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL3VzZXJzLmpzb24nKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnVzZXJNYW5hZ2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIMSwemluIGtvbnRyb2zDvCAtIFRPRE86IEltcGxlbWVudFxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja1Blcm1pc3Npb24odXNlcjogc3RyaW5nLCBwZXJtaXNzaW9uOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBUT0RPOiBJbXBsZW1lbnQgcGVybWlzc2lvbiBjaGVja2luZ1xuICAgIHJldHVybiB0cnVlOyAvLyBQbGFjZWhvbGRlclxuICB9XG5cbiAgLyoqXG4gICAqIERvc3lhIHnDvGtsZSAoU1RPUikgLSBUT0RPOiBJbXBsZW1lbnRcbiAgICovXG4gIHB1YmxpYyBhc3luYyB1cGxvYWRGaWxlKFxuICAgIGNvbm46IEZ0cENvbm5lY3Rpb24sXG4gICAgcmVtb3RlUGF0aDogc3RyaW5nLFxuICAgIGRhdGE6IEJ1ZmZlclxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZyhgW0ZpbGVUcmFuc2Zlcl0gRG9zeWEgecO8a2xlbWU6ICR7Y29ubi51c2VyIHx8ICd1bmtub3duJ30gLSAke3JlbW90ZVBhdGh9YCk7XG4gICAgXG4gICAgLy8gxLB6aW4ga29udHJvbMO8XG4gICAgaWYgKCF0aGlzLnVzZXJNYW5hZ2VyLmNoZWNrUGVybWlzc2lvbihjb25uLnVzZXIgfHwgJycsICd3cml0ZScpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT19QRVJNSVNTSU9OO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQZXJtaXNzaW9uIGRlbmllZDogdXBsb2FkYDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBEb3N5YSB5w7xrbGVtZSBpbXBsZW1lbnRhc3lvbnVcbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5DTURfRVJSO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgQ29tbWFuZCBub3QgeWV0IGltcGxlbWVudGVkOiBTVE9SYDsgIFxuICB9XG5cbiAgLyoqXG4gICAqIERvc3lhIGluZGlyIChSRVRSKSAtIFRPRE86IEltcGxlbWVudFxuICAgKi9cbiAgcHVibGljIGFzeW5jIGRvd25sb2FkRmlsZShcbiAgICBjb25uOiBGdHBDb25uZWN0aW9uLFxuICAgIHJlbW90ZVBhdGg6IHN0cmluZ1xuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZyhgW0ZpbGVUcmFuc2Zlcl0gRG9zeWEgaW5kaXJtZTogJHtjb25uLnVzZXIgfHwgJ3Vua25vd24nfSAtICR7cmVtb3RlUGF0aH1gKTtcbiAgICBcbiAgICAvLyDEsHppbiBrb250cm9sw7xcbiAgICBpZiAoIXRoaXMudXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ3JlYWQnKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IGRvd25sb2FkYDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBEb3N5YSBpbmRpcm1lIGltcGxlbWVudGFzeW9udVxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkNNRF9FUlI7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBDb21tYW5kIG5vdCB5ZXQgaW1wbGVtZW50ZWQ6IFJFVFJgOyAgXG4gIH1cblxuICAvKipcbiAgICogRG9zeWEgc2lsIChERUxFKSAtIFRPRE86IEltcGxlbWVudFxuICAgKi9cbiAgcHVibGljIGFzeW5jIGRlbGV0ZUZpbGUoXG4gICAgY29ubjogRnRwQ29ubmVjdGlvbixcbiAgICByZW1vdGVQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coYFtGaWxlVHJhbnNmZXJdIERvc3lhIHNpbG1lOiAke2Nvbm4udXNlciB8fCAndW5rbm93bid9IC0gJHtyZW1vdGVQYXRofWApO1xuICAgIFxuICAgIC8vIMSwemluIGtvbnRyb2zDvFxuICAgIGlmICghdGhpcy51c2VyTWFuYWdlci5jaGVja1Blcm1pc3Npb24oY29ubi51c2VyIHx8ICcnLCAnZGVsZXRlJykpIHtcbiAgICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLk5PX1BFUk1JU1NJT047XG4gICAgICBjb25uLmxhc3RNZXNzYWdlID0gYFBlcm1pc3Npb24gZGVuaWVkOiBkZWxldGVgO1xuICAgIH1cblxuICAgIC8vIFRPRE86IERvc3lhIHNpbG1lIGltcGxlbWVudGFzeW9udVxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkNNRF9FUlI7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBDb21tYW5kIG5vdCB5ZXQgaW1wbGVtZW50ZWQ6IERFTEVgOyAgXG4gIH1cblxuICAvKipcbiAgICogRGl6aW4gb2x1xZ90dXJtYSAoTUtEKSAtIFRPRE86IEltcGxlbWVudFxuICAgKi9cbiAgcHVibGljIGFzeW5jIGNyZWF0ZURpcmVjdG9yeShcbiAgICBjb25uOiBGdHBDb25uZWN0aW9uLFxuICAgIHJlbW90ZVBhdGg6IHN0cmluZ1xuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZyhgW0ZpbGVUcmFuc2Zlcl0gRGl6aW4gb2x1xZ90dXJtYTogJHtjb25uLnVzZXIgfHwgJ3Vua25vd24nfSAtICR7cmVtb3RlUGF0aH1gKTtcbiAgICBcbiAgICAvLyDEsHppbiBrb250cm9sw7xcbiAgICBpZiAoIXRoaXMudXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ21rZCcpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT19QRVJNSVNTSU9OO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQZXJtaXNzaW9uIGRlbmllZDogY3JlYXRlIGRpcmVjdG9yeWA7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogRGl6aW4gb2x1xZ90dXJtYSBpbXBsZW1lbnRhc3lvbnVcbiAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5DTURfRVJSO1xuICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgQ29tbWFuZCBub3QgeWV0IGltcGxlbWVudGVkOiBNS0RgOyAgXG4gIH1cblxuICAvKipcbiAgICogRGl6aW4gc2lsbWUgKFJNRCkgLSBUT0RPOiBJbXBsZW1lbnRcbiAgICovXG4gIHB1YmxpYyBhc3luYyByZW1vdmVEaXJlY3RvcnkoXG4gICAgY29ubjogRnRwQ29ubmVjdGlvbixcbiAgICByZW1vdGVQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coYFtGaWxlVHJhbnNmZXJdIERpemluIHNpbG1lOiAke2Nvbm4udXNlciB8fCAndW5rbm93bid9IC0gJHtyZW1vdGVQYXRofWApO1xuICAgIFxuICAgIC8vIMSwemluIGtvbnRyb2zDvFxuICAgIGlmICghdGhpcy51c2VyTWFuYWdlci5jaGVja1Blcm1pc3Npb24oY29ubi51c2VyIHx8ICcnLCAncm1kaXInKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IHJlbW92ZSBkaXJlY3RvcnlgO1xuICAgIH1cblxuICAgIC8vIFRPRE86IERpemluIHNpbG1lIGltcGxlbWVudGFzeW9udVxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkNNRF9FUlI7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBDb21tYW5kIG5vdCB5ZXQgaW1wbGVtZW50ZWQ6IFJNRGA7ICBcbiAgfVxuXG4gIC8qKlxuICAgKiBEb3N5YSB5ZW5pZGVuIGFkbGFuZMSxcm1hIChSTkZSL1JOVE8pIC0gVE9ETzogSW1wbGVtZW50XG4gICAqL1xuICBwdWJsaWMgYXN5bmMgcmVuYW1lRmlsZShcbiAgICBjb25uOiBGdHBDb25uZWN0aW9uLFxuICAgIG9sZFBhdGg6IHN0cmluZyxcbiAgICBuZXdQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coYFtGaWxlVHJhbnNmZXJdIERvc3lhIHllbmlkZW4gYWRsYW5kxLFybWE6ICR7Y29ubi51c2VyIHx8ICd1bmtub3duJ30gLSAke29sZFBhdGh9IC0+ICR7bmV3UGF0aH1gKTtcbiAgICBcbiAgICAvLyDEsHppbiBrb250cm9sw7xcbiAgICBpZiAoIXRoaXMudXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGNvbm4udXNlciB8fCAnJywgJ3JlbmFtZScpKSB7XG4gICAgICBjb25uLmxhc3RSZXBseSA9IFJlcGx5Q29kZS5OT19QRVJNSVNTSU9OO1xuICAgICAgY29ubi5sYXN0TWVzc2FnZSA9IGBQZXJtaXNzaW9uIGRlbmllZDogcmVuYW1lYDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBEb3N5YSB5ZW5pZGVuIGFkbGFuZMSxcm1hIGltcGxlbWVudGFzeW9udVxuICAgIGNvbm4ubGFzdFJlcGx5ID0gUmVwbHlDb2RlLkNNRF9FUlI7XG4gICAgY29ubi5sYXN0TWVzc2FnZSA9IGBDb21tYW5kIG5vdCB5ZXQgaW1wbGVtZW50ZWQ6IFJORlIvUk5UT2A7ICBcbiAgfVxuXG4gIC8qKlxuICAgKiBEb3N5YSBpemlubGVyaW5pIGRlxJ9pxZ90aXIgKENITU9EKSAtIFRPRE86IEltcGxlbWVudFxuICAgKi9cbiAgcHVibGljIGFzeW5jIGNoYW5nZUZpbGVNb2RlKFxuICAgIGNvbm46IEZ0cENvbm5lY3Rpb24sXG4gICAgcmVtb3RlUGF0aDogc3RyaW5nLFxuICAgIG1vZGU6IG51bWJlclxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZyhgW0ZpbGVUcmFuc2Zlcl0gRG9zeWEgaXppbmxlcmkgZGXEn2nFn3Rpcm1lOiAke2Nvbm4udXNlciB8fCAndW5rbm93bid9IC0gJHtyZW1vdGVQYXRofWApO1xuICAgIFxuICAgIC8vIMSwemluIGtvbnRyb2zDvFxuICAgIGlmICghdGhpcy51c2VyTWFuYWdlci5jaGVja1Blcm1pc3Npb24oY29ubi51c2VyIHx8ICcnLCAnY2htb2QnKSkge1xuICAgICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuTk9fUEVSTUlTU0lPTjtcbiAgICAgIGNvbm4ubGFzdE1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQ6IGNobW9kYDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBEb3N5YSBpemlubGVyaSBkZcSfacWfdGlybWUgaW1wbGVtZW50YXN5b251XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuQ01EX0VSUjtcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYENvbW1hbmQgbm90IHlldCBpbXBsZW1lbnRlZDogQ0hNT0RgOyAgXG4gIH1cbn1cblxuLy8gU2luZ2xldG9uIGluc3RhbmNlXG5leHBvcnQgY29uc3QgZmlsZVRyYW5zZmVyID0gbmV3IEZpbGVUcmFuc2ZlcigpOyJdfQ==