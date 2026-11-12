import { UserPermissions } from '../types';
export interface LogRow {
    id: number;
    level: string;
    message: string;
    createdAt: string;
}
export declare class DatabaseManager {
    private db;
    private dbPath;
    private logInserts;
    constructor(dbPath?: string);
    getDbPath(): string;
    init(): void;
    close(): void;
    private getDb;
    getAllUsers(): Array<{
        id: number;
        username: string;
        password: string;
        homeDir: string;
        permissions: UserPermissions;
        isActive: boolean;
    }>;
    getUserByUsername(username: string): Array<{
        id: number;
        username: string;
        password: string;
        homeDir: string;
        permissions: UserPermissions;
        isActive: boolean;
    }> | null;
    addUser({ username, password, homeDir, permissions, isActive, }: {
        username: string;
        password: string;
        homeDir: string;
        permissions: UserPermissions;
        isActive?: boolean;
    }): boolean;
    deleteUser(username: string): boolean;
    toggleUserStatus(username: string, isActive: boolean): boolean;
    updatePermissions(username: string, permissions: UserPermissions): boolean;
    changeUsername(oldUsername: string, newUsername: string): boolean;
    changePassword(username: string, newPassword: string): boolean;
    changeHomeDir(username: string, newHomeDir: string): boolean;
    getActiveUsers(): Array<{
        id: number;
        username: string;
        password: string;
        homeDir: string;
        permissions: UserPermissions;
        isActive: boolean;
    }>;
    getUserCount(): number;
    getSetting(key: string): string | null;
    setSetting(key: string, value: string, description?: string): void;
    deleteSetting(key: string): boolean;
    getAllSettings(): Record<string, string>;
    insertLogs(records: Array<{
        level: string;
        message: string;
        createdAt: string;
    }>): number;
    insertLog(level: string, message: string, createdAt: string): void;
    getLogs(options?: {
        sinceId?: number;
        levels?: string[];
        limit?: number;
    }): LogRow[];
    getLogCount(): number;
    clearLogs(): number;
    pruneLogs(maxRows?: number): number;
    toLinuxString(permissions: UserPermissions | undefined | null): string;
    fromLinuxString(value: string | null | undefined): UserPermissions;
}
