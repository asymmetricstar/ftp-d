import * as net from 'net';
import { FtpConnection, DataConnection } from './types';
export declare class ConnectionPool {
    private connections;
    private dataConnections;
    private config;
    constructor(config?: {
        maxConnections?: number;
        maxDataConnections?: number;
        dataPort?: number;
    });
    createFtpConnection(socket: net.Socket, connId: string, user: string | null, homeDir: string): FtpConnection;
    getFtpConnection(connId: string): FtpConnection | null;
    removeFtpConnection(connId: string): void;
    getActiveConnections(): number;
    listConnections(): Map<string, FtpConnection>;
    createDataConnection(socket: net.Socket, connId: string, passive: boolean): DataConnection;
    getDataConnection(connId: string): DataConnection | null;
    closeDataConnection(connId: string): void;
    checkDataConnectionLimit(): boolean;
    getStats(): {
        ftpConnections: number;
        dataConnections: number;
        totalConnections: number;
    };
    clearAll(): void;
}
export declare const connectionPool: ConnectionPool;
