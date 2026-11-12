import { UserPermissions } from '../types';
export declare class DatabaseManager {
    private db;
    private dbPath;
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
    toLinuxString(permissions: UserPermissions | undefined | null): string;
    fromLinuxString(value: string | null | undefined): UserPermissions;
}
