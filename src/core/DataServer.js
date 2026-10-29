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
exports.DataServer = void 0;
const net = __importStar(require("net"));
const logger_1 = require("../utils/logger");
class DataServer {
    constructor(port) {
        this.server = null;
        this.port = port;
    }
    start() {
        try {
            this.server = net.createServer((socket) => {
                logger_1.Logger.info(`[DataServer] Data bağlantısı kuruldu: port ${this.port}`);
                socket.on('data', (data) => {
                });
                socket.on('error', (err) => {
                    logger_1.Logger.error(`[DataServer] Data bağlantı hatası: ${err.message}`);
                });
                socket.on('close', () => {
                    logger_1.Logger.info(`[DataServer] Data bağlantısı kapandı`);
                });
            });
            this.server.listen(this.port, () => {
                logger_1.Logger.info(`[+] Data sunucusu başlatıldı: port ${this.port}`);
            });
            this.server.on('error', (err) => {
                logger_1.Logger.error(`[DataServer] Sunucu hatası: ${err.message}`);
            });
        }
        catch (error) {
            logger_1.Logger.error('[DataServer] Başlatma hatası:', error);
        }
    }
    stop() {
        if (this.server) {
            this.server.close();
            logger_1.Logger.info(`[DataServer] Data sunucusu kapandı`);
        }
    }
}
exports.DataServer = DataServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YVNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL0RhdGFTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLGdDQUFZO0FBQzNCLDRDQUF5QztBQUt6QztJQUlFLFlBQVksSUFBWTtRQUhoQixXQUFNLEdBQXNCLElBQUksQ0FBQztRQUl2QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRU0sS0FBSztRQUNWLElBQUksQ0FBQztZQUNILElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUN4QyxlQUFNLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDdkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtnQkFFbkMsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDekIsZUFBTSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3BFLENBQUMsQ0FBQyxDQUFDO2dCQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtvQkFDdEIsZUFBTSxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO2dCQUN0RCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ2pDLGVBQU0sQ0FBQyxJQUFJLENBQUMsc0NBQXNDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzlCLGVBQU0sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzdELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixlQUFNLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELENBQUM7SUFDSCxDQUFDO0lBRU0sSUFBSTtRQUNULElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEIsZUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ3BELENBQUM7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5cbi8qKlxuICogRGF0YSBTdW51Y3VzdSBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgRGF0YVNlcnZlciB7XG4gIHByaXZhdGUgc2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcG9ydDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHBvcnQ6IG51bWJlcikge1xuICAgIHRoaXMucG9ydCA9IHBvcnQ7XG4gIH1cblxuICBwdWJsaWMgc3RhcnQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoc29ja2V0KSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRGF0YVNlcnZlcl0gRGF0YSBiYcSfbGFudMSxc8SxIGt1cnVsZHU6IHBvcnQgJHt0aGlzLnBvcnR9YCk7XG4gICAgICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgICAgICAvLyBEYXRhIHRyYW5zZmVyIGnFn2xlbWxlcmlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICBMb2dnZXIuZXJyb3IoYFtEYXRhU2VydmVyXSBEYXRhIGJhxJ9sYW50xLEgaGF0YXPEsTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc29ja2V0Lm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICBMb2dnZXIuaW5mbyhgW0RhdGFTZXJ2ZXJdIERhdGEgYmHEn2xhbnTEsXPEsSBrYXBhbmTEsWApO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcnZlci5saXN0ZW4odGhpcy5wb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbK10gRGF0YSBzdW51Y3VzdSBiYcWfbGF0xLFsZMSxOiBwb3J0ICR7dGhpcy5wb3J0fWApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc2VydmVyLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKGBbRGF0YVNlcnZlcl0gU3VudWN1IGhhdGFzxLE6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgTG9nZ2VyLmVycm9yKCdbRGF0YVNlcnZlcl0gQmHFn2xhdG1hIGhhdGFzxLE6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBzdG9wKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNlcnZlcikge1xuICAgICAgdGhpcy5zZXJ2ZXIuY2xvc2UoKTtcbiAgICAgIExvZ2dlci5pbmZvKGBbRGF0YVNlcnZlcl0gRGF0YSBzdW51Y3VzdSBrYXBhbmTEsWApO1xuICAgIH1cbiAgfVxufVxuIl19