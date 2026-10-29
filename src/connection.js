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
exports.connectionPool = exports.ConnectionPool = void 0;
const net = __importStar(require("net"));
class ConnectionPool {
    constructor(config = {}) {
        this.connections = new Map();
        this.dataConnections = new Map();
        this.config = {
            maxConnections: config.maxConnections || 100,
            maxDataConnections: config.maxDataConnections || 50,
            dataPort: config.dataPort || 20,
        };
        console.log(`[ConnectionPool] Max connections: ${this.config.maxConnections}`);
        console.log(`[ConnectionPool] Max data connections: ${this.config.maxDataConnections}`);
    }
    createFtpConnection(socket, connId, user, homeDir) {
        const connection = {
            socket,
            user,
            pass: null,
            homeDir,
            currentDir: homeDir,
            permissions: {},
            transferMode: null,
            transferSize: 0,
            lastReply: 0,
            lastMessage: '',
        };
        this.connections.set(connId, connection);
        console.log(`[ConnectionPool] FTP bağlantısı oluşturuldu: ${connId}`);
        return connection;
    }
    getFtpConnection(connId) {
        return this.connections.get(connId) || null;
    }
    removeFtpConnection(connId) {
        this.connections.delete(connId);
        console.log(`[ConnectionPool] FTP bağlantısı silindi: ${connId}`);
    }
    getActiveConnections() {
        return this.connections.size;
    }
    listConnections() {
        return new Map(this.connections);
    }
    createDataConnection(socket, connId, passive) {
        const dataSocket = net.createConnection(this.config.dataPort, '127.0.0.1');
        dataSocket.on('connect', () => {
            console.log(`[ConnectionPool] Data connection connected: ${connId}`);
        });
        const dataConnection = {
            socket: dataSocket,
            passive,
            localPort: this.config.dataPort,
            state: 'listening',
        };
        this.dataConnections.set(connId, dataConnection);
        return dataConnection;
    }
    getDataConnection(connId) {
        return this.dataConnections.get(connId) || null;
    }
    closeDataConnection(connId) {
        const dataConn = this.dataConnections.get(connId);
        if (dataConn) {
            dataConn.socket.end();
            this.dataConnections.delete(connId);
            console.log(`[ConnectionPool] Data connection kapatıldı: ${connId}`);
        }
    }
    checkDataConnectionLimit() {
        if (this.dataConnections.size >= this.config.maxDataConnections) {
            console.log(`[ConnectionPool] Veri bağlantısı limiti aşıldı: ${this.dataConnections.size}/${this.config.maxDataConnections}`);
            return false;
        }
        return true;
    }
    getStats() {
        return {
            ftpConnections: this.connections.size,
            dataConnections: this.dataConnections.size,
            totalConnections: this.connections.size + this.dataConnections.size,
        };
    }
    clearAll() {
        console.log('[ConnectionPool] Tüm bağlantılar temizleniyor...');
        this.connections.forEach((conn, connId) => {
            conn.socket.end();
        });
        this.connections.clear();
        this.dataConnections.forEach((dataConn, connId) => {
            dataConn.socket.end();
        });
        this.dataConnections.clear();
    }
}
exports.ConnectionPool = ConnectionPool;
exports.connectionPool = new ConnectionPool();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksR0FBRyxnQ0FBWTtBQU8zQjtJQVNFLFlBQVksTUFBTSxHQUlkLEVBQUU7UUFaRSxnQkFBVyxHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3BELG9CQUFlLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUM7UUFZL0QsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLGNBQWMsRUFBRSxNQUFNLENBQUMsY0FBYyxJQUFJLEdBQUc7WUFDNUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixJQUFJLEVBQUU7WUFDbkQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLElBQUksRUFBRTtTQUNoQyxDQUFDO1FBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQTBDLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFLTSxtQkFBbUIsQ0FDeEIsTUFBa0IsRUFDbEIsTUFBYyxFQUNkLElBQW1CLEVBQ25CLE9BQWU7UUFFZixNQUFNLFVBQVUsR0FBa0I7WUFDaEMsTUFBTTtZQUNOLElBQUk7WUFDSixJQUFJLEVBQUUsSUFBSTtZQUNWLE9BQU87WUFDUCxVQUFVLEVBQUUsT0FBTztZQUNuQixXQUFXLEVBQUUsRUFBRTtZQUNmLFlBQVksRUFBRSxJQUFJO1lBQ2xCLFlBQVksRUFBRSxDQUFDO1lBQ2YsU0FBUyxFQUFFLENBQUM7WUFDWixXQUFXLEVBQUUsRUFBRTtTQUNoQixDQUFDO1FBRUYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0RBQWdELE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdEUsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUtNLGdCQUFnQixDQUFDLE1BQWM7UUFDcEMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDOUMsQ0FBQztJQUtNLG1CQUFtQixDQUFDLE1BQWM7UUFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBS00sb0JBQW9CO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7SUFDL0IsQ0FBQztJQUtNLGVBQWU7UUFDcEIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUtNLG9CQUFvQixDQUN6QixNQUFrQixFQUNsQixNQUFjLEVBQ2QsT0FBZ0I7UUFFaEIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzNFLFVBQVUsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtZQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLCtDQUErQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQW1CO1lBQ3JDLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLE9BQU87WUFDUCxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRO1lBQy9CLEtBQUssRUFBRSxXQUFXO1NBQ25CLENBQUM7UUFFRixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakQsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQUtNLGlCQUFpQixDQUFDLE1BQWM7UUFDckMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDbEQsQ0FBQztJQUtNLG1CQUFtQixDQUFDLE1BQWM7UUFDdkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNiLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO0lBQ0gsQ0FBQztJQUtNLHdCQUF3QjtRQUM3QixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUNoRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztZQUM5SCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFLTSxRQUFRO1FBS2IsT0FBTztZQUNMLGNBQWMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUk7WUFDckMsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSTtZQUMxQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUk7U0FDcEUsQ0FBQztJQUNKLENBQUM7SUFLTSxRQUFRO1FBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2hELFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRjs7QUFHWSxRQUFBLGNBQWMsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgbmV0IGZyb20gJ25ldCc7XG5pbXBvcnQgeyBGdHBDb25uZWN0aW9uLCBEYXRhQ29ubmVjdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgVXNlck1hbmFnZXIgfSBmcm9tICcuL3VzZXJNYW5hZ2VyJztcblxuLyoqXG4gKiBDb25uZWN0aW9uUG9vbCAtIEJhxJ9sYW50xLEgaGF2dXp1IHnDtm5ldGltaVxuICovXG5leHBvcnQgY2xhc3MgQ29ubmVjdGlvblBvb2wge1xuICBwcml2YXRlIGNvbm5lY3Rpb25zOiBNYXA8c3RyaW5nLCBGdHBDb25uZWN0aW9uPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBkYXRhQ29ubmVjdGlvbnM6IE1hcDxzdHJpbmcsIERhdGFDb25uZWN0aW9uPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBjb25maWc6IHtcbiAgICBtYXhDb25uZWN0aW9uczogbnVtYmVyO1xuICAgIG1heERhdGFDb25uZWN0aW9uczogbnVtYmVyO1xuICAgIGRhdGFQb3J0OiBudW1iZXI7XG4gIH07XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiB7XG4gICAgbWF4Q29ubmVjdGlvbnM/OiBudW1iZXI7XG4gICAgbWF4RGF0YUNvbm5lY3Rpb25zPzogbnVtYmVyO1xuICAgIGRhdGFQb3J0PzogbnVtYmVyO1xuICB9ID0ge30pIHtcbiAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgIG1heENvbm5lY3Rpb25zOiBjb25maWcubWF4Q29ubmVjdGlvbnMgfHwgMTAwLFxuICAgICAgbWF4RGF0YUNvbm5lY3Rpb25zOiBjb25maWcubWF4RGF0YUNvbm5lY3Rpb25zIHx8IDUwLFxuICAgICAgZGF0YVBvcnQ6IGNvbmZpZy5kYXRhUG9ydCB8fCAyMCxcbiAgICB9O1xuICAgIGNvbnNvbGUubG9nKGBbQ29ubmVjdGlvblBvb2xdIE1heCBjb25uZWN0aW9uczogJHt0aGlzLmNvbmZpZy5tYXhDb25uZWN0aW9uc31gKTtcbiAgICBjb25zb2xlLmxvZyhgW0Nvbm5lY3Rpb25Qb29sXSBNYXggZGF0YSBjb25uZWN0aW9uczogJHt0aGlzLmNvbmZpZy5tYXhEYXRhQ29ubmVjdGlvbnN9YCk7XG4gIH1cblxuICAvKipcbiAgICogWWVuaSBGVFAgYmHEn2xhbnTEsXPEsSBvbHXFn3R1clxuICAgKi9cbiAgcHVibGljIGNyZWF0ZUZ0cENvbm5lY3Rpb24oXG4gICAgc29ja2V0OiBuZXQuU29ja2V0LFxuICAgIGNvbm5JZDogc3RyaW5nLFxuICAgIHVzZXI6IHN0cmluZyB8IG51bGwsXG4gICAgaG9tZURpcjogc3RyaW5nXG4gICk6IEZ0cENvbm5lY3Rpb24ge1xuICAgIGNvbnN0IGNvbm5lY3Rpb246IEZ0cENvbm5lY3Rpb24gPSB7XG4gICAgICBzb2NrZXQsXG4gICAgICB1c2VyLFxuICAgICAgcGFzczogbnVsbCxcbiAgICAgIGhvbWVEaXIsXG4gICAgICBjdXJyZW50RGlyOiBob21lRGlyLFxuICAgICAgcGVybWlzc2lvbnM6IHt9LFxuICAgICAgdHJhbnNmZXJNb2RlOiBudWxsLFxuICAgICAgdHJhbnNmZXJTaXplOiAwLFxuICAgICAgbGFzdFJlcGx5OiAwLFxuICAgICAgbGFzdE1lc3NhZ2U6ICcnLFxuICAgIH07XG5cbiAgICB0aGlzLmNvbm5lY3Rpb25zLnNldChjb25uSWQsIGNvbm5lY3Rpb24pO1xuICAgIGNvbnNvbGUubG9nKGBbQ29ubmVjdGlvblBvb2xdIEZUUCBiYcSfbGFudMSxc8SxIG9sdcWfdHVydWxkdTogJHtjb25uSWR9YCk7XG4gICAgcmV0dXJuIGNvbm5lY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogQmHEn2xhbnTEsXnEsSBhbFxuICAgKi9cbiAgcHVibGljIGdldEZ0cENvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcpOiBGdHBDb25uZWN0aW9uIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbnMuZ2V0KGNvbm5JZCkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCYcSfbGFudMSxecSxIHNpbFxuICAgKi9cbiAgcHVibGljIHJlbW92ZUZ0cENvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmNvbm5lY3Rpb25zLmRlbGV0ZShjb25uSWQpO1xuICAgIGNvbnNvbGUubG9nKGBbQ29ubmVjdGlvblBvb2xdIEZUUCBiYcSfbGFudMSxc8SxIHNpbGluZGk6ICR7Y29ubklkfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFrdGlmIGJhxJ9sYW50xLEgc2F5xLFzxLFcbiAgICovXG4gIHB1YmxpYyBnZXRBY3RpdmVDb25uZWN0aW9ucygpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmNvbm5lY3Rpb25zLnNpemU7XG4gIH1cblxuICAvKipcbiAgICogVMO8bSBiYcSfbGFudMSxbGFyxLEgbGlzdGVsZVxuICAgKi9cbiAgcHVibGljIGxpc3RDb25uZWN0aW9ucygpOiBNYXA8c3RyaW5nLCBGdHBDb25uZWN0aW9uPiB7XG4gICAgcmV0dXJuIG5ldyBNYXAodGhpcy5jb25uZWN0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogWWVuaSB2ZXJpIGJhxJ9sYW50xLFzxLEgb2x1xZ90dXIgKFBBU1YvUEFTU0lWRSlcbiAgICovXG4gIHB1YmxpYyBjcmVhdGVEYXRhQ29ubmVjdGlvbihcbiAgICBzb2NrZXQ6IG5ldC5Tb2NrZXQsXG4gICAgY29ubklkOiBzdHJpbmcsXG4gICAgcGFzc2l2ZTogYm9vbGVhblxuICApOiBEYXRhQ29ubmVjdGlvbiB7XG4gICAgY29uc3QgZGF0YVNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHRoaXMuY29uZmlnLmRhdGFQb3J0LCAnMTI3LjAuMC4xJyk7XG4gICAgZGF0YVNvY2tldC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKGBbQ29ubmVjdGlvblBvb2xdIERhdGEgY29ubmVjdGlvbiBjb25uZWN0ZWQ6ICR7Y29ubklkfWApO1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGF0YUNvbm5lY3Rpb246IERhdGFDb25uZWN0aW9uID0ge1xuICAgICAgc29ja2V0OiBkYXRhU29ja2V0LFxuICAgICAgcGFzc2l2ZSxcbiAgICAgIGxvY2FsUG9ydDogdGhpcy5jb25maWcuZGF0YVBvcnQsXG4gICAgICBzdGF0ZTogJ2xpc3RlbmluZycsXG4gICAgfTtcblxuICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25zLnNldChjb25uSWQsIGRhdGFDb25uZWN0aW9uKTtcbiAgICByZXR1cm4gZGF0YUNvbm5lY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogVmVyaSBiYcSfbGFudMSxc8SxbsSxIGFsXG4gICAqL1xuICBwdWJsaWMgZ2V0RGF0YUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcpOiBEYXRhQ29ubmVjdGlvbiB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmRhdGFDb25uZWN0aW9ucy5nZXQoY29ubklkKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmkgYmHEn2xhbnTEsXPEsW7EsSBrYXBhdFxuICAgKi9cbiAgcHVibGljIGNsb3NlRGF0YUNvbm5lY3Rpb24oY29ubklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBkYXRhQ29ubiA9IHRoaXMuZGF0YUNvbm5lY3Rpb25zLmdldChjb25uSWQpO1xuICAgIGlmIChkYXRhQ29ubikge1xuICAgICAgZGF0YUNvbm4uc29ja2V0LmVuZCgpO1xuICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbnMuZGVsZXRlKGNvbm5JZCk7XG4gICAgICBjb25zb2xlLmxvZyhgW0Nvbm5lY3Rpb25Qb29sXSBEYXRhIGNvbm5lY3Rpb24ga2FwYXTEsWxkxLE6ICR7Y29ubklkfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNYWtzaW11bSB2ZXJpIGJhxJ9sYW50xLFzxLEga29udHJvbMO8XG4gICAqL1xuICBwdWJsaWMgY2hlY2tEYXRhQ29ubmVjdGlvbkxpbWl0KCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLmRhdGFDb25uZWN0aW9ucy5zaXplID49IHRoaXMuY29uZmlnLm1heERhdGFDb25uZWN0aW9ucykge1xuICAgICAgY29uc29sZS5sb2coYFtDb25uZWN0aW9uUG9vbF0gVmVyaSBiYcSfbGFudMSxc8SxIGxpbWl0aSBhxZ/EsWxkxLE6ICR7dGhpcy5kYXRhQ29ubmVjdGlvbnMuc2l6ZX0vJHt0aGlzLmNvbmZpZy5tYXhEYXRhQ29ubmVjdGlvbnN9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEJhxJ9sYW50xLEgaXN0YXRpc3Rpa2xlcmlcbiAgICovXG4gIHB1YmxpYyBnZXRTdGF0cygpOiB7XG4gICAgZnRwQ29ubmVjdGlvbnM6IG51bWJlcjtcbiAgICBkYXRhQ29ubmVjdGlvbnM6IG51bWJlcjtcbiAgICB0b3RhbENvbm5lY3Rpb25zOiBudW1iZXI7XG4gIH0ge1xuICAgIHJldHVybiB7XG4gICAgICBmdHBDb25uZWN0aW9uczogdGhpcy5jb25uZWN0aW9ucy5zaXplLFxuICAgICAgZGF0YUNvbm5lY3Rpb25zOiB0aGlzLmRhdGFDb25uZWN0aW9ucy5zaXplLFxuICAgICAgdG90YWxDb25uZWN0aW9uczogdGhpcy5jb25uZWN0aW9ucy5zaXplICsgdGhpcy5kYXRhQ29ubmVjdGlvbnMuc2l6ZSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFTDvG0gYmHEn2xhbnTEsWxhcsSxIHRlbWl6bGVcbiAgICovXG4gIHB1YmxpYyBjbGVhckFsbCgpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0Nvbm5lY3Rpb25Qb29sXSBUw7xtIGJhxJ9sYW50xLFsYXIgdGVtaXpsZW5peW9yLi4uJyk7XG4gICAgdGhpcy5jb25uZWN0aW9ucy5mb3JFYWNoKChjb25uLCBjb25uSWQpID0+IHtcbiAgICAgIGNvbm4uc29ja2V0LmVuZCgpO1xuICAgIH0pO1xuICAgIHRoaXMuY29ubmVjdGlvbnMuY2xlYXIoKTtcbiAgICB0aGlzLmRhdGFDb25uZWN0aW9ucy5mb3JFYWNoKChkYXRhQ29ubiwgY29ubklkKSA9PiB7XG4gICAgICBkYXRhQ29ubi5zb2NrZXQuZW5kKCk7XG4gICAgfSk7XG4gICAgdGhpcy5kYXRhQ29ubmVjdGlvbnMuY2xlYXIoKTtcbiAgfVxufVxuXG4vLyBTaW5nbGV0b24gaW5zdGFuY2VcbmV4cG9ydCBjb25zdCBjb25uZWN0aW9uUG9vbCA9IG5ldyBDb25uZWN0aW9uUG9vbCgpOyJdfQ==