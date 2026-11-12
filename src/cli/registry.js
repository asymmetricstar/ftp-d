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
exports.handleFtpCommand = handleFtpCommand;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function handleFtpCommand(rawLine, ctx) {
    const line = (rawLine || '').trim();
    if (line === '') {
        return { lines: [] };
    }
    const separatorIndex = line.search(/\s/);
    const command = (separatorIndex === -1 ? line : line.slice(0, separatorIndex)).toLowerCase();
    const args = separatorIndex === -1 ? '' : line.slice(separatorIndex).trim();
    switch (command) {
        case 'help':
            return {
                lines: [
                    'Available commands:',
                    '  help            - Show this help',
                    '  clear           - Clear screen',
                    '  exit            - Exit the FTP shell (Ctrl+D / quit / q / :q)',
                    '  quit            - Exit the FTP shell',
                    '  q               - Exit the FTP shell',
                    '  version         - Show version',
                    '  status          - Show session status',
                    '  whoami          - Show current user',
                    '  ls [path]       - List directory',
                    '  pwd             - Print working directory',
                    '  cd <path>       - Change directory',
                ],
            };
        case 'clear':
            return { lines: [], clear: true };
        case 'version':
            return { lines: ['ftpd version 0.0.2'] };
        case 'exit':
        case 'quit':
        case 'q':
        case ':q':
            return { lines: [], exit: true };
        case 'status':
        case 'whoami':
        case 'who': {
            const user = ctx.user;
            const lines = [];
            lines.push(`Session: ${user ? user : 'anonymous'}`);
            lines.push(`Home: ${ctx.homeDir || '-'}`);
            lines.push(`CurrentDir: ${ctx.currentDir || '-'}`);
            return { lines };
        }
        case 'pwd':
            return { lines: [`Pwd: ${ctx.currentDir || ctx.homeDir || '~'}`] };
        case 'ls': {
            if (!ctx.user) {
                return { lines: ['Not logged in'] };
            }
            const userManager = ctx.server.getUserManager();
            if (!userManager) {
                return { lines: ['UserManager not initialized'] };
            }
            const hasList = userManager.checkPermission(ctx.user, 'list');
            if (!hasList) {
                return { lines: ['Permission denied: ls'] };
            }
            const targetDir = path.resolve(ctx.currentDir || ctx.homeDir || '.');
            const dirents = fs.readdirSync(targetDir).map((name) => {
                const full = path.join(targetDir, name);
                const st = fs.statSync(full);
                const type = st.isDirectory() ? 'd' : '-';
                const size = st.size;
                return `${type} ${size.toString().padStart(8)} ${name}`;
            });
            if (dirents.length === 0) {
                return { lines: [`${targetDir} :: (empty)`] };
            }
            return { lines: dirents.map((l) => l) };
        }
        case 'cd': {
            if (!ctx.user) {
                return { lines: ['Not logged in'] };
            }
            const userManager = ctx.server.getUserManager();
            if (!userManager) {
                return { lines: ['UserManager not initialized'] };
            }
            const hasList = userManager.checkPermission(ctx.user, 'list');
            if (!hasList) {
                return { lines: ['Permission denied: cd'] };
            }
            const targetDir = args.trim() ? path.resolve(args.trim()) : ctx.homeDir || '.';
            ctx.currentDir = targetDir;
            return { lines: [`Cd ok: ${targetDir}`] };
        }
        default:
            return { lines: [`Command not implemented: ${command}`] };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY2xpL3JlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLE1BQVksSUFBSSxpQ0FBYTtBQUM3QixNQUFZLEVBQUUsK0JBQVc7QUFXekIsMEJBQWlDLE9BQWUsRUFBRSxHQUFrQjtJQUNsRSxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNwQyxJQUFJLElBQUksS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUNoQixPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sT0FBTyxHQUFHLENBQUMsY0FBYyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0YsTUFBTSxJQUFJLEdBQUcsY0FBYyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFNUUsUUFBUSxPQUFPLEVBQUUsQ0FBQztRQUNoQixLQUFLLE1BQU07WUFDVCxPQUFPO2dCQUNMLEtBQUssRUFBRTtvQkFDTCxxQkFBcUI7b0JBQ3JCLG9DQUFvQztvQkFDcEMsa0NBQWtDO29CQUNsQyxpRUFBaUU7b0JBQ2pFLHdDQUF3QztvQkFDeEMsd0NBQXdDO29CQUN4QyxrQ0FBa0M7b0JBQ2xDLHlDQUF5QztvQkFDekMsdUNBQXVDO29CQUN2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QUFDO1lBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxVQUFVLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM1QyxDQUFDO1FBRUQ7WUFDRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsNEJBQTRCLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEZ0cENsaUNvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHsgRnRwU2VydmVyIH0gZnJvbSAnLi4vY29yZS9GdHBTZXJ2ZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGludGVyZmFjZSBGdHBDb21tYW5kUmVzdWx0IHtcbiAgbGluZXM6IHN0cmluZ1tdO1xuICBjbGVhcj86IGJvb2xlYW47XG4gIGV4aXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEZUUCBDTEkga29tdXRsYXLEsW7EsSBpxZ9sZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlRnRwQ29tbWFuZChyYXdMaW5lOiBzdHJpbmcsIGN0eDogRnRwQ2xpQ29udGV4dCk6IEZ0cENvbW1hbmRSZXN1bHQge1xuICBjb25zdCBsaW5lID0gKHJhd0xpbmUgfHwgJycpLnRyaW0oKTtcbiAgaWYgKGxpbmUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHsgbGluZXM6IFtdIH07XG4gIH1cblxuICBjb25zdCBzZXBhcmF0b3JJbmRleCA9IGxpbmUuc2VhcmNoKC9cXHMvKTtcbiAgY29uc3QgY29tbWFuZCA9IChzZXBhcmF0b3JJbmRleCA9PT0gLTEgPyBsaW5lIDogbGluZS5zbGljZSgwLCBzZXBhcmF0b3JJbmRleCkpLnRvTG93ZXJDYXNlKCk7XG4gIGNvbnN0IGFyZ3MgPSBzZXBhcmF0b3JJbmRleCA9PT0gLTEgPyAnJyA6IGxpbmUuc2xpY2Uoc2VwYXJhdG9ySW5kZXgpLnRyaW0oKTtcblxuICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICBjYXNlICdoZWxwJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxpbmVzOiBbXG4gICAgICAgICAgJ0F2YWlsYWJsZSBjb21tYW5kczonLFxuICAgICAgICAgICcgIGhlbHAgICAgICAgICAgICAtIFNob3cgdGhpcyBoZWxwJyxcbiAgICAgICAgICAnICBjbGVhciAgICAgICAgICAgLSBDbGVhciBzY3JlZW4nLFxuICAgICAgICAgICcgIGV4aXQgICAgICAgICAgICAtIEV4aXQgdGhlIEZUUCBzaGVsbCAoQ3RybCtEIC8gcXVpdCAvIHEgLyA6cSknLFxuICAgICAgICAgICcgIHF1aXQgICAgICAgICAgICAtIEV4aXQgdGhlIEZUUCBzaGVsbCcsXG4gICAgICAgICAgJyAgcSAgICAgICAgICAgICAgIC0gRXhpdCB0aGUgRlRQIHNoZWxsJyxcbiAgICAgICAgICAnICB2ZXJzaW9uICAgICAgICAgLSBTaG93IHZlcnNpb24nLFxuICAgICAgICAgICcgIHN0YXR1cyAgICAgICAgICAtIFNob3cgc2Vzc2lvbiBzdGF0dXMnLFxuICAgICAgICAgICcgIHdob2FtaSAgICAgICAgICAtIFNob3cgY3VycmVudCB1c2VyJyxcbiAgICAgICAgICAnICBscyBbcGF0aF0gICAgICAgLSBMaXN0IGRpcmVjdG9yeScsXG4gICAgICAgICAgJyAgcHdkICAgICAgICAgICAgIC0gUHJpbnQgd29ya2luZyBkaXJlY3RvcnknLFxuICAgICAgICAgICcgIGNkIDxwYXRoPiAgICAgICAtIENoYW5nZSBkaXJlY3RvcnknLFxuICAgICAgICBdLFxuICAgICAgfTtcblxuICAgIGNhc2UgJ2NsZWFyJzpcbiAgICAgIHJldHVybiB7IGxpbmVzOiBbXSwgY2xlYXI6IHRydWUgfTtcblxuICAgIGNhc2UgJ3ZlcnNpb24nOlxuICAgICAgcmV0dXJuIHsgbGluZXM6IFsnZnRwZCB2ZXJzaW9uIDAuMC4yJ10gfTtcblxuICAgIGNhc2UgJ2V4aXQnOlxuICAgIGNhc2UgJ3F1aXQnOlxuICAgIGNhc2UgJ3EnOlxuICAgIGNhc2UgJzpxJzpcbiAgICAgIHJldHVybiB7IGxpbmVzOiBbXSwgZXhpdDogdHJ1ZSB9O1xuXG4gICAgY2FzZSAnc3RhdHVzJzpcbiAgICBjYXNlICd3aG9hbWknOlxuICAgIGNhc2UgJ3dobyc6IHtcbiAgICAgIGNvbnN0IHVzZXIgPSBjdHgudXNlcjtcbiAgICAgIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgbGluZXMucHVzaChgU2Vzc2lvbjogJHt1c2VyID8gdXNlciA6ICdhbm9ueW1vdXMnfWApO1xuICAgICAgbGluZXMucHVzaChgSG9tZTogJHtjdHguaG9tZURpciB8fCAnLSd9YCk7XG4gICAgICBsaW5lcy5wdXNoKGBDdXJyZW50RGlyOiAke2N0eC5jdXJyZW50RGlyIHx8ICctJ31gKTtcbiAgICAgIHJldHVybiB7IGxpbmVzIH07XG4gICAgfVxuXG4gICAgY2FzZSAncHdkJzpcbiAgICAgIHJldHVybiB7IGxpbmVzOiBbYFB3ZDogJHtjdHguY3VycmVudERpciB8fCBjdHguaG9tZURpciB8fCAnfid9YF0gfTtcblxuICAgIGNhc2UgJ2xzJzoge1xuICAgICAgaWYgKCFjdHgudXNlcikge1xuICAgICAgICByZXR1cm4geyBsaW5lczogWydOb3QgbG9nZ2VkIGluJ10gfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVzZXJNYW5hZ2VyID0gY3R4LnNlcnZlci5nZXRVc2VyTWFuYWdlcigpO1xuICAgICAgaWYgKCF1c2VyTWFuYWdlcikge1xuICAgICAgICByZXR1cm4geyBsaW5lczogWydVc2VyTWFuYWdlciBub3QgaW5pdGlhbGl6ZWQnXSB9O1xuICAgICAgfVxuICAgICAgY29uc3QgaGFzTGlzdCA9IHVzZXJNYW5hZ2VyLmNoZWNrUGVybWlzc2lvbihjdHgudXNlciwgJ2xpc3QnKTtcbiAgICAgIGlmICghaGFzTGlzdCkge1xuICAgICAgICByZXR1cm4geyBsaW5lczogWydQZXJtaXNzaW9uIGRlbmllZDogbHMnXSB9O1xuICAgICAgfVxuICAgICAgY29uc3QgdGFyZ2V0RGlyID0gcGF0aC5yZXNvbHZlKGN0eC5jdXJyZW50RGlyIHx8IGN0eC5ob21lRGlyIHx8ICcuJyk7XG4gICAgICBjb25zdCBkaXJlbnRzID0gZnMucmVhZGRpclN5bmModGFyZ2V0RGlyKS5tYXAoKG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgZnVsbCA9IHBhdGguam9pbih0YXJnZXREaXIsIG5hbWUpO1xuICAgICAgICBjb25zdCBzdCA9IGZzLnN0YXRTeW5jKGZ1bGwpO1xuICAgICAgICBjb25zdCB0eXBlID0gc3QuaXNEaXJlY3RvcnkoKSA/ICdkJyA6ICctJztcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHN0LnNpemU7XG4gICAgICAgIHJldHVybiBgJHt0eXBlfSAke3NpemUudG9TdHJpbmcoKS5wYWRTdGFydCg4KX0gJHtuYW1lfWA7XG4gICAgICB9KTtcbiAgICAgIGlmIChkaXJlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4geyBsaW5lczogW2Ake3RhcmdldERpcn0gOjogKGVtcHR5KWBdIH07XG4gICAgICB9XG4gICAgICByZXR1cm4geyBsaW5lczogZGlyZW50cy5tYXAoKGwpID0+IGwpIH07XG4gICAgfVxuXG4gICAgY2FzZSAnY2QnOiB7XG4gICAgICBpZiAoIWN0eC51c2VyKSB7XG4gICAgICAgIHJldHVybiB7IGxpbmVzOiBbJ05vdCBsb2dnZWQgaW4nXSB9O1xuICAgICAgfVxuICAgICAgY29uc3QgdXNlck1hbmFnZXIgPSBjdHguc2VydmVyLmdldFVzZXJNYW5hZ2VyKCk7XG4gICAgICBpZiAoIXVzZXJNYW5hZ2VyKSB7XG4gICAgICAgIHJldHVybiB7IGxpbmVzOiBbJ1VzZXJNYW5hZ2VyIG5vdCBpbml0aWFsaXplZCddIH07XG4gICAgICB9XG4gICAgICBjb25zdCBoYXNMaXN0ID0gdXNlck1hbmFnZXIuY2hlY2tQZXJtaXNzaW9uKGN0eC51c2VyLCAnbGlzdCcpO1xuICAgICAgaWYgKCFoYXNMaXN0KSB7XG4gICAgICAgIHJldHVybiB7IGxpbmVzOiBbJ1Blcm1pc3Npb24gZGVuaWVkOiBjZCddIH07XG4gICAgICB9XG4gICAgICBjb25zdCB0YXJnZXREaXIgPSBhcmdzLnRyaW0oKSA/IHBhdGgucmVzb2x2ZShhcmdzLnRyaW0oKSkgOiBjdHguaG9tZURpciB8fCAnLic7XG4gICAgICBjdHguY3VycmVudERpciA9IHRhcmdldERpcjtcbiAgICAgIHJldHVybiB7IGxpbmVzOiBbYENkIG9rOiAke3RhcmdldERpcn1gXSB9O1xuICAgIH1cblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBsaW5lczogW2BDb21tYW5kIG5vdCBpbXBsZW1lbnRlZDogJHtjb21tYW5kfWBdIH07XG4gIH1cbn1cbiJdfQ==