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
exports.BIN = exports.SETTINGS = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function readPackageVersion() {
    try {
        const raw = fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.version === 'string' && parsed.version.trim() !== '') {
            return parsed.version;
        }
    }
    catch {
    }
    return '0.0.0';
}
exports.SETTINGS = {
    packageName: 'ftp-d',
    bin: 'ftpd',
    name: 'ftpd-lite',
    mark: 'μFtp',
    version: readPackageVersion(),
    label: '',
    tagline: 'lightweight ftp server',
    description: 'FTP server with SQLite persistence',
    footer: 'Free and Open Source',
    envPrefix: 'FTPD',
    configDir: '.ftpd',
};
exports.BIN = exports.SETTINGS.bin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpL3RoZW1lL3NldHRpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLElBQUksaUNBQWE7QUFVN0IsU0FBUyxrQkFBa0I7SUFDekIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25GLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUEwQixDQUFDO1FBQ3hELElBQUksT0FBTyxNQUFNLENBQUMsT0FBTyxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3ZFLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUN4QixDQUFDO0lBQ0gsQ0FBQztJQUFDLE1BQU0sQ0FBQztJQUVULENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBRVksUUFBQSxRQUFRLEdBWWpCO0lBQ0YsV0FBVyxFQUFFLE9BQU87SUFFcEIsR0FBRyxFQUFFLE1BQU07SUFFWCxJQUFJLEVBQUUsV0FBVztJQUVqQixJQUFJLEVBQUUsTUFBTTtJQUNaLE9BQU8sRUFBRSxrQkFBa0IsRUFBRTtJQUU3QixLQUFLLEVBQUUsRUFBRTtJQUNULE9BQU8sRUFBRSx3QkFBd0I7SUFDakMsV0FBVyxFQUFFLG9DQUFvQztJQUNqRCxNQUFNLEVBQUUsc0JBQXNCO0lBQzlCLFNBQVMsRUFBRSxNQUFNO0lBQ2pCLFNBQVMsRUFBRSxPQUFPO0NBQ25CLENBQUM7QUFHVyxRQUFBLEdBQUcsR0FBRyxRQUFBLFFBQVEsQ0FBQyxHQUFHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vKipcbiAqIEZUUCBDTEkgdGVtYSDigJQgdMO8bSBrdWxsYW7EsWPEsXlhIGfDtnLDvG5lbiBzdGF0aWsgaXNpbWxlciB0ZWsgeWVyZGUuXG4gKi9cblxuLyoqXG4gKiBTw7xyw7xtIG51bWFyYXPEsSBwYWNrYWdlLmpzb24nZGFuIG9rdW51cjsgYsO2eWxlY2UgYmFubmVyIGlsZSBwYWtldCBzw7xyw7xtw7xcbiAqIGJpcmJpcmluZGVuIGF5csSxIGTDvMWfbWV6LiBEb3N5YSBva3VuYW1henNhIHNhYml0IGJpciBkZcSfZXJlIGTDvMWfZXIuXG4gKi9cbmZ1bmN0aW9uIHJlYWRQYWNrYWdlVmVyc2lvbigpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vcGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIHsgdmVyc2lvbj86IHVua25vd24gfTtcbiAgICBpZiAodHlwZW9mIHBhcnNlZC52ZXJzaW9uID09PSAnc3RyaW5nJyAmJiBwYXJzZWQudmVyc2lvbi50cmltKCkgIT09ICcnKSB7XG4gICAgICByZXR1cm4gcGFyc2VkLnZlcnNpb247XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBwYWtldCBkb3N5YXPEsSBva3VuYW1henNhIGHFn2HEn8SxZGFraSB5ZWRlayBkZcSfZXIga3VsbGFuxLFsxLFyXG4gIH1cbiAgcmV0dXJuICcwLjAuMCc7XG59XG5cbmV4cG9ydCBjb25zdCBTRVRUSU5HUzoge1xuICBwYWNrYWdlTmFtZTogc3RyaW5nO1xuICBiaW46IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBtYXJrOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgbGFiZWw6IHN0cmluZztcbiAgdGFnbGluZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBmb290ZXI6IHN0cmluZztcbiAgZW52UHJlZml4OiBzdHJpbmc7XG4gIGNvbmZpZ0Rpcjogc3RyaW5nO1xufSA9IHtcbiAgcGFja2FnZU5hbWU6ICdmdHAtZCcsXG4gIC8qKiBQcm9tcHQndW4gw6dhxJ/EsXJkxLHEn8SxIGtvbXV0IChgYWRtaW5AZnRwZDpgKSAqL1xuICBiaW46ICdmdHBkJyxcbiAgLyoqIEJhbm5lciBiYcWfbMSxxJ/EsSAqL1xuICBuYW1lOiAnZnRwZC1saXRlJyxcbiAgLyoqIEFTQ0lJIGxvZ28gacWfYXJldGkgKi9cbiAgbWFyazogJ868RnRwJyxcbiAgdmVyc2lvbjogcmVhZFBhY2thZ2VWZXJzaW9uKCksXG4gIC8qKiBOQU1FIHNvbnVuZGEgYOKAomAgaWxlIGfDtnN0ZXJpbGVuIHlhbiBldGlrZXQ7IGJvxZ9zYSBnw7ZzdGVyaWxtZXogKi9cbiAgbGFiZWw6ICcnLFxuICB0YWdsaW5lOiAnbGlnaHR3ZWlnaHQgZnRwIHNlcnZlcicsXG4gIGRlc2NyaXB0aW9uOiAnRlRQIHNlcnZlciB3aXRoIFNRTGl0ZSBwZXJzaXN0ZW5jZScsXG4gIGZvb3RlcjogJ0ZyZWUgYW5kIE9wZW4gU291cmNlJyxcbiAgZW52UHJlZml4OiAnRlRQRCcsXG4gIGNvbmZpZ0RpcjogJy5mdHBkJyxcbn07XG5cbi8qKiBUaGUgY29tbWFuZCB1c2VycyB0eXBlLiAqL1xuZXhwb3J0IGNvbnN0IEJJTiA9IFNFVFRJTkdTLmJpbjtcbiJdfQ==