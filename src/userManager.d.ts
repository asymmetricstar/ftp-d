import { User, UserPermissions, Permission } from './types';
import { DatabaseManager } from './db/database';
export declare class UserManager {
    private db;
    private users;
    private persist;
    constructor(dbOrData: DatabaseManager | any, persist?: boolean);
    private normalizeData;
    private load;
    findUser(username: string): User | null;
    addUser(username: string, password: string, homeDir: string, permissions: UserPermissions): boolean;
    deleteUser(username: string): boolean;
    toggleUserStatus(username: string, isActive: boolean): boolean;
    updatePermissions(username: string, permissions: UserPermissions): boolean;
    checkPermission(username: string, permission: Permission): boolean;
    listUsers(): User[];
    getUserStats(): Map<string, number>;
    getUserCount(): number;
    changeUsername(oldUsername: string, newUsername: string): boolean;
    changePassword(username: string, newPassword: string): boolean;
    changeHomeDir(username: string, newHomeDir: string): boolean;
    getDb(): DatabaseManager | null;
    static toLinuxAction(permission: Permission): 'read' | 'write' | 'execute';
    static getInstance(db: DatabaseManager): UserManager;
    private static _instance;
}
export declare function getUserManager(db?: DatabaseManager): Promise<UserManager>;
