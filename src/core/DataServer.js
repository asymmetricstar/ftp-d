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
                logger_1.Logger.info(`[DataServer] Data connection established: port ${this.port}`);
                socket.on('data', (data) => {
                });
                socket.on('error', (err) => {
                    logger_1.Logger.error(`[DataServer] Data connection error: ${err.message}`);
                });
                socket.on('close', () => {
                    logger_1.Logger.info('[DataServer] Data connection closed');
                });
            });
            this.server.listen(this.port, () => {
                logger_1.Logger.info(`[DataServer] Data server started: port ${this.port}`);
            });
            this.server.on('error', (err) => {
                logger_1.Logger.error(`[DataServer] Server error: ${err.message}`);
            });
        }
        catch (error) {
            logger_1.Logger.error('[DataServer] Startup error:', error);
        }
    }
    stop() {
        if (this.server) {
            this.server.close();
            logger_1.Logger.info('[DataServer] Data server closed');
        }
    }
}
exports.DataServer = DataServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YVNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL0RhdGFTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLGdDQUFZO0FBQzNCLDRDQUF5QztBQUt6QztJQUlFLFlBQVksSUFBWTtRQUhoQixXQUFNLEdBQXNCLElBQUksQ0FBQztRQUl2QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRU0sS0FBSztRQUNWLElBQUksQ0FBQztZQUNILElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUN4QyxlQUFNLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDM0UsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtnQkFFbkMsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDekIsZUFBTSxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3JFLENBQUMsQ0FBQyxDQUFDO2dCQUVILE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtvQkFDdEIsZUFBTSxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO2dCQUNyRCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ2pDLGVBQU0sQ0FBQyxJQUFJLENBQUMsMENBQTBDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzlCLGVBQU0sQ0FBQyxLQUFLLENBQUMsOEJBQThCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixlQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JELENBQUM7SUFDSCxDQUFDO0lBRU0sSUFBSTtRQUNULElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEIsZUFBTSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2pELENBQUM7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5cbi8qKlxuICogRGF0YSBTdW51Y3VzdSBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgRGF0YVNlcnZlciB7XG4gIHByaXZhdGUgc2VydmVyOiBuZXQuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcG9ydDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHBvcnQ6IG51bWJlcikge1xuICAgIHRoaXMucG9ydCA9IHBvcnQ7XG4gIH1cblxuICBwdWJsaWMgc3RhcnQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlcigoc29ja2V0KSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRGF0YVNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIGVzdGFibGlzaGVkOiBwb3J0ICR7dGhpcy5wb3J0fWApO1xuICAgICAgICBzb2NrZXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgICAgLy8gRGF0YSB0cmFuc2ZlciBpxZ9sZW1sZXJpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgICAgTG9nZ2VyLmVycm9yKGBbRGF0YVNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIGVycm9yOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9KTtcblxuICAgICAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIExvZ2dlci5pbmZvKCdbRGF0YVNlcnZlcl0gRGF0YSBjb25uZWN0aW9uIGNsb3NlZCcpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcnZlci5saXN0ZW4odGhpcy5wb3J0LCAoKSA9PiB7XG4gICAgICAgIExvZ2dlci5pbmZvKGBbRGF0YVNlcnZlcl0gRGF0YSBzZXJ2ZXIgc3RhcnRlZDogcG9ydCAke3RoaXMucG9ydH1gKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcnZlci5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIExvZ2dlci5lcnJvcihgW0RhdGFTZXJ2ZXJdIFNlcnZlciBlcnJvcjogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBMb2dnZXIuZXJyb3IoJ1tEYXRhU2VydmVyXSBTdGFydHVwIGVycm9yOicsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgc3RvcCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZXJ2ZXIpIHtcbiAgICAgIHRoaXMuc2VydmVyLmNsb3NlKCk7XG4gICAgICBMb2dnZXIuaW5mbygnW0RhdGFTZXJ2ZXJdIERhdGEgc2VydmVyIGNsb3NlZCcpO1xuICAgIH1cbiAgfVxufVxuIl19