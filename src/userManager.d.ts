import { User, UserPermissions, Permission } from './types';
export declare class UserManager {
    private userFile;
    private users;
    private data;
    constructor(userFile: string);
    private load;
    private save;
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
    static getInstance(userFile: string): UserManager;
    private static _instance;
}
export declare function getUserManager(userFile?: string): Promise<UserManager>;
