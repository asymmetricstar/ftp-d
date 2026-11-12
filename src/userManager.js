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
exports.UserManager = void 0;
exports.getUserManager = getUserManager;
const logger_1 = require("./utils/logger");
const path = __importStar(require("path"));
const database_1 = require("./db/database");
const DEFAULT_USERS = [
    {
        username: 'anonymous',
        password: '',
        homeDir: path.resolve('./'),
        permissions: {
            owner: { read: true, write: false, execute: true },
            group: { read: true, write: false, execute: true },
            others: { read: true, write: false, execute: true },
        },
        isActive: true,
    }
];
class UserManager {
    constructor(dbOrData, persist = true) {
        this.users = [];
        if (dbOrData instanceof database_1.DatabaseManager) {
            this.db = dbOrData;
            this.persist = true;
            this.load();
        }
        else {
            this.db = null;
            this.persist = false;
            this.users = this.normalizeData(dbOrData);
            if (!this.users || this.users.length === 0) {
                this.users = DEFAULT_USERS;
            }
            logger_1.Logger.info(`[UserManager] ${this.users.length} users loaded (in-memory)`);
        }
    }
    normalizeData(input) {
        try {
            if (input && Array.isArray(input.users)) {
                return input.users;
            }
            if (Array.isArray(input)) {
                return input;
            }
            if (input && input.data && Array.isArray(input.data.users)) {
                return input.data.users;
            }
        }
        catch (e) {
        }
        return [...DEFAULT_USERS];
    }
    load() {
        try {
            const db = this.db;
            const dbUsers = db.getAllUsers();
            this.users = dbUsers.map((u) => ({
                username: u.username,
                password: u.password,
                homeDir: u.homeDir,
                permissions: u.permissions,
                isActive: u.isActive,
            }));
            if (this.users.length === 0) {
                for (const defUser of DEFAULT_USERS) {
                    db.addUser({
                        username: defUser.username,
                        password: defUser.password,
                        homeDir: defUser.homeDir,
                        permissions: defUser.permissions,
                        isActive: defUser.isActive,
                    });
                }
                this.users = [...DEFAULT_USERS];
                logger_1.Logger.info(`[UserManager] Default ${this.users.length} users created in SQLite`);
            }
            else {
                logger_1.Logger.info(`[UserManager] ${this.users.length} users loaded from SQLite`);
            }
        }
        catch (error) {
            logger_1.Logger.error(`[UserManager] Load error:`);
            this.users = [...DEFAULT_USERS];
        }
    }
    findUser(username, includeInactive = false) {
        if (!username || username.trim() === '') {
            return null;
        }
        const user = this.users.find((u) => u.username.toLowerCase() === username.toLowerCase() &&
            (includeInactive || u.isActive));
        return user;
    }
    addUser(username, password, homeDir, permissions) {
        if (!username) {
            logger_1.Logger.error(`[UserManager] Invalid username`);
            return false;
        }
        const existing = this.findUser(username, true);
        if (existing) {
            logger_1.Logger.error(`[UserManager] User already exists: ${username}`);
            return false;
        }
        const newUser = {
            username,
            password,
            homeDir: path.resolve(homeDir),
            permissions: { ...permissions },
            isActive: true,
        };
        this.users.push(newUser);
        if (this.persist && this.db) {
            const ok = this.db.addUser({
                username,
                password,
                homeDir: newUser.homeDir,
                permissions: newUser.permissions,
                isActive: true,
            });
            if (!ok) {
                logger_1.Logger.error(`[UserManager] Failed to persist user: ${username}`);
                return false;
            }
        }
        logger_1.Logger.info(`[UserManager] User added: ${username}`);
        return true;
    }
    deleteUser(username) {
        const user = this.findUser(username, true);
        if (!user) {
            logger_1.Logger.info(`[UserManager] User not found: ${username}`);
            return false;
        }
        this.users = this.users.filter((u) => u.username !== username);
        if (this.persist && this.db) {
            this.db.deleteUser(username);
        }
        logger_1.Logger.info(`[UserManager] User deleted: ${username}`);
        return true;
    }
    toggleUserStatus(username, isActive) {
        const user = this.findUser(username, true);
        if (!user) {
            logger_1.Logger.info(`[UserManager] User not found: ${username}`);
            return false;
        }
        user.isActive = isActive;
        if (this.persist && this.db) {
            this.db.toggleUserStatus(username, isActive);
        }
        logger_1.Logger.info(`[UserManager] User status changed: ${username} (${isActive ? 'active' : 'passive'})`);
        return true;
    }
    updatePermissions(username, permissions) {
        const user = this.findUser(username, true);
        if (!user) {
            logger_1.Logger.info(`[UserManager] User not found: ${username}`);
            return false;
        }
        const currentPermissions = user.permissions || {};
        const newPermissions = {
            ...currentPermissions,
            ...permissions,
        };
        user.permissions = newPermissions;
        if (this.persist && this.db) {
            this.db.updatePermissions(username, newPermissions);
        }
        logger_1.Logger.info(`[UserManager] Permissions updated: ${username}`);
        return true;
    }
    checkPermission(username, permission) {
        const user = this.findUser(username);
        if (!user) {
            logger_1.Logger.info(`[UserManager] User not found: ${username}`);
            return false;
        }
        const action = UserManager.toLinuxAction(permission);
        const hasPermission = user.permissions?.owner?.[action] === true;
        if (!hasPermission) {
            logger_1.Logger.info(`[UserManager] Permission denied: ${username} - ${permission}`);
        }
        else {
            logger_1.Logger.info(`[UserManager] Permission granted: ${username} - ${permission}`);
        }
        return hasPermission;
    }
    listUsers(includeInactive = false) {
        return includeInactive ? [...this.users] : this.users.filter((u) => u.isActive);
    }
    getUserStats() {
        const stats = new Map();
        this.users.forEach((user) => {
            stats.set(user.username, Object.keys(user.permissions || {}).length);
        });
        return stats;
    }
    getUserCount() {
        return this.users.filter((u) => u.isActive).length;
    }
    changeUsername(oldUsername, newUsername) {
        const user = this.findUser(oldUsername, true);
        if (!user) {
            logger_1.Logger.info(`[UserManager] User not found: ${oldUsername}`);
            return false;
        }
        const existing = this.findUser(newUsername, true);
        if (existing) {
            logger_1.Logger.info(`[UserManager] Username already exists: ${newUsername}`);
            return false;
        }
        user.username = newUsername;
        if (this.persist && this.db) {
            this.db.changeUsername(oldUsername, newUsername);
        }
        logger_1.Logger.info(`[UserManager] Username changed: ${oldUsername} -> ${newUsername}`);
        return true;
    }
    changePassword(username, newPassword) {
        const user = this.findUser(username, true);
        if (!user) {
            logger_1.Logger.info(`[UserManager] User not found: ${username}`);
            return false;
        }
        user.password = newPassword;
        if (this.persist && this.db) {
            this.db.changePassword(username, newPassword);
        }
        logger_1.Logger.info(`[UserManager] Password changed: ${username}`);
        return true;
    }
    changeHomeDir(username, newHomeDir) {
        const user = this.findUser(username, true);
        if (!user) {
            logger_1.Logger.info(`[UserManager] User not found: ${username}`);
            return false;
        }
        user.homeDir = path.resolve(newHomeDir);
        if (this.persist && this.db) {
            this.db.changeHomeDir(username, user.homeDir);
        }
        logger_1.Logger.info(`[UserManager] Directory changed: ${username} -> ${user.homeDir}`);
        return true;
    }
    getDb() {
        return this.db || null;
    }
    static toLinuxAction(permission) {
        const p = permission;
        if (p === 'write' || p === 'create' || p === 'append' || p === 'delete' || p === 'chmod' || p === 'mkd' || p === 'rmdir' || p === 'rename' || p === 'deletemyfiles') {
            return 'write';
        }
        if (p === 'execute') {
            return 'execute';
        }
        if (p === 'list') {
            return 'read';
        }
        return 'read';
    }
    static getInstance(db) {
        if (!UserManager._instance) {
            UserManager._instance = new UserManager(db);
        }
        return UserManager._instance;
    }
}
exports.UserManager = UserManager;
UserManager._instance = null;
let userManagerInstance = null;
let userManagerInitPromise = null;
async function getUserManager(db) {
    if (!userManagerInitPromise) {
        userManagerInitPromise = (async () => {
            if (!userManagerInstance) {
                if (!db) {
                    db = new database_1.DatabaseManager();
                    db.init();
                }
                userManagerInstance = new UserManager(db);
            }
            return userManagerInstance;
        })();
    }
    return userManagerInitPromise;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlck1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXNlck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUF3QztBQUN4QyxNQUFZLElBQUksaUNBQWE7QUFFN0IsNENBQWdEO0FBS2hELE1BQU0sYUFBYSxHQUFXO0lBQzVCO1FBQ0UsUUFBUSxFQUFFLFdBQVc7UUFDckIsUUFBUSxFQUFFLEVBQUU7UUFDWixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDM0IsV0FBVyxFQUFFO1lBQ1gsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDbEQsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDbEQsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDcEQ7UUFDRCxRQUFRLEVBQUUsSUFBSTtLQUNmO0NBQ0YsQ0FBQztBQU9GO0lBS0UsWUFBWSxRQUErQixFQUFFLE9BQU8sR0FBWSxJQUFJO1FBSDVELFVBQUssR0FBVyxFQUFFLENBQUM7UUFJekIsSUFBSSxRQUFRLFlBQVksMEJBQWUsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDO1lBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNkLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFDZixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUss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QUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUNELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQztJQUMvQixDQUFDO0NBR0Y7O0FBRGdCLHFCQUFTLEdBQXVCLElBQUksQUFBM0IsQ0FBNEI7QUFJdEQsSUFBSSxtQkFBbUIsR0FBdUIsSUFBSSxDQUFDO0FBQ25ELElBQUksc0JBQXNCLEdBQWdDLElBQUksQ0FBQztBQUV4RCxLQUFLLHlCQUF5QixFQUFvQjtJQUN2RCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM1QixzQkFBc0IsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ25DLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ1IsRUFBRSxHQUFHLElBQUksMEJBQWUsRUFBRSxDQUFDO29CQUMzQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1osQ0FBQztnQkFDRCxtQkFBbUIsR0FBRyxJQUFJLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QyxDQUFDO1lBQ0QsT0FBTyxtQkFBbUIsQ0FBQztRQUM3QixDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ1AsQ0FBQztJQUNELE9BQU8sc0JBQXNCLENBQUM7QUFDaEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4vdXRpbHMvbG9nZ2VyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBVc2VyLCBVc2VyUGVybWlzc2lvbnMsIFBlcm1pc3Npb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IERhdGFiYXNlTWFuYWdlciB9IGZyb20gJy4vZGIvZGF0YWJhc2UnO1xuXG4vKipcbiAqIERlZmF1bHQga3VsbGFuxLFjxLFsYXIgKHZlcml0YWJhbsSxIGJvxZ8gb2xkdcSfdW5kYSBpbGsgw6dhbMSxxZ90xLFybWFkYSBla2xlbmlyKVxuICovXG5jb25zdCBERUZBVUxUX1VTRVJTOiBVc2VyW10gPSBbXG4gIHtcbiAgICB1c2VybmFtZTogJ2Fub255bW91cycsXG4gICAgcGFzc3dvcmQ6ICcnLFxuICAgIGhvbWVEaXI6IHBhdGgucmVzb2x2ZSgnLi8nKSxcbiAgICBwZXJtaXNzaW9uczoge1xuICAgICAgb3duZXI6IHsgcmVhZDogdHJ1ZSwgd3JpdGU6IGZhbHNlLCBleGVjdXRlOiB0cnVlIH0sXG4gICAgICBncm91cDogeyByZWFkOiB0cnVlLCB3cml0ZTogZmFsc2UsIGV4ZWN1dGU6IHRydWUgfSxcbiAgICAgIG90aGVyczogeyByZWFkOiB0cnVlLCB3cml0ZTogZmFsc2UsIGV4ZWN1dGU6IHRydWUgfSxcbiAgICB9LFxuICAgIGlzQWN0aXZlOiB0cnVlLFxuICB9XG5dO1xuXG4vKipcbiAqIFVzZXJNYW5hZ2VyIGNsYXNzIC0gS3VsbGFuxLFjxLEgecO2bmV0aW1pXG4gKlxuICogS3VsbGFuxLFjxLFsYXIgYXJ0xLFrIEpTT04gZG9zeWFzxLEgeWVyaW5lIFNRTGl0ZSAndXNlcnMnIHRhYmxvc3VuZGEgdHV0dWx1ci5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZXJNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBkYjogRGF0YWJhc2VNYW5hZ2VyIHwgbnVsbDtcbiAgcHJpdmF0ZSB1c2VyczogVXNlcltdID0gW107XG4gIHByaXZhdGUgcGVyc2lzdDogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihkYk9yRGF0YTogRGF0YWJhc2VNYW5hZ2VyIHwgYW55LCBwZXJzaXN0OiBib29sZWFuID0gdHJ1ZSkge1xuICAgIGlmIChkYk9yRGF0YSBpbnN0YW5jZW9mIERhdGFiYXNlTWFuYWdlcikge1xuICAgICAgdGhpcy5kYiA9IGRiT3JEYXRhO1xuICAgICAgdGhpcy5wZXJzaXN0ID0gdHJ1ZTtcbiAgICAgIHRoaXMubG9hZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRiID0gbnVsbDtcbiAgICAgIHRoaXMucGVyc2lzdCA9IGZhbHNlO1xuICAgICAgdGhpcy51c2VycyA9IHRoaXMubm9ybWFsaXplRGF0YShkYk9yRGF0YSk7XG4gICAgICBpZiAoIXRoaXMudXNlcnMgfHwgdGhpcy51c2Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy51c2VycyA9IERFRkFVTFRfVVNFUlM7XG4gICAgICB9XG4gICAgICBMb2dnZXIuaW5mbyhgW1VzZXJNYW5hZ2VyXSAke3RoaXMudXNlcnMubGVuZ3RofSB1c2VycyBsb2FkZWQgKGluLW1lbW9yeSlgKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2VsZW4geWFwxLFsYW5kxLFybWFzxLFuxLEgVXNlciBkaXppc2luZSBub3JtYWxpemUgZXRcbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplRGF0YShpbnB1dDogYW55KTogVXNlcltdIHtcbiAgICB0cnkge1xuICAgICAgaWYgKGlucHV0ICYmIEFycmF5LmlzQXJyYXkoaW5wdXQudXNlcnMpKSB7XG4gICAgICAgIHJldHVybiBpbnB1dC51c2VycyBhcyBVc2VyW107XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShpbnB1dCkpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0IGFzIFVzZXJbXTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnB1dCAmJiBpbnB1dC5kYXRhICYmIEFycmF5LmlzQXJyYXkoaW5wdXQuZGF0YS51c2VycykpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0LmRhdGEudXNlcnMgYXMgVXNlcltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIHlva3NheVxuICAgIH1cbiAgICByZXR1cm4gWy4uLkRFRkFVTFRfVVNFUlNdO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIHZlcmlsZXJpbmkgU1FMaXRlICd1c2VycycgdGFibG9zdW5kYW4gecO8a2xlXG4gICAqL1xuICBwcml2YXRlIGxvYWQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRiID0gdGhpcy5kYiE7XG4gICAgICBjb25zdCBkYlVzZXJzID0gZGIuZ2V0QWxsVXNlcnMoKTtcbiAgICAgIHRoaXMudXNlcnMgPSBkYlVzZXJzLm1hcCgodSkgPT4gKHtcbiAgICAgICAgdXNlcm5hbWU6IHUudXNlcm5hbWUsXG4gICAgICAgIHBhc3N3b3JkOiB1LnBhc3N3b3JkLFxuICAgICAgICBob21lRGlyOiB1LmhvbWVEaXIsXG4gICAgICAgIHBlcm1pc3Npb25zOiB1LnBlcm1pc3Npb25zIGFzIFVzZXJQZXJtaXNzaW9ucyxcbiAgICAgICAgaXNBY3RpdmU6IHUuaXNBY3RpdmUsXG4gICAgICB9KSk7XG4gICAgICBpZiAodGhpcy51c2Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVmVyaXRhYmFuxLEgYm/Fn3NhIHZhcnNhecSxbGFuIGt1bGxhbsSxY8SxbGFyxLEgZWtsZVxuICAgICAgICBmb3IgKGNvbnN0IGRlZlVzZXIgb2YgREVGQVVMVF9VU0VSUykge1xuICAgICAgICAgIGRiLmFkZFVzZXIoe1xuICAgICAgICAgICAgdXNlcm5hbWU6IGRlZlVzZXIudXNlcm5hbWUsXG4gICAgICAgICAgICBwYXNzd29yZDogZGVmVXNlci5wYXNzd29yZCxcbiAgICAgICAgICAgIGhvbWVEaXI6IGRlZlVzZXIuaG9tZURpcixcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBkZWZVc2VyLnBlcm1pc3Npb25zIGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+LFxuICAgICAgICAgICAgaXNBY3RpdmU6IGRlZlVzZXIuaXNBY3RpdmUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51c2VycyA9IFsuLi5ERUZBVUxUX1VTRVJTXTtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gRGVmYXVsdCAke3RoaXMudXNlcnMubGVuZ3RofSB1c2VycyBjcmVhdGVkIGluIFNRTGl0ZWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gJHt0aGlzLnVzZXJzLmxlbmd0aH0gdXNlcnMgbG9hZGVkIGZyb20gU1FMaXRlYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIExvZ2dlci5lcnJvcihgW1VzZXJNYW5hZ2VyXSBMb2FkIGVycm9yOmApO1xuICAgICAgdGhpcy51c2VycyA9IFsuLi5ERUZBVUxUX1VTRVJTXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgYnVsLlxuICAgKiBTZXNzaXogYmlyIGFyYW1hZMSxcjsgRlRQIGdpcmnFn2kgcGFzaWYga3VsbGFuxLFjxLFsYXLEsSBnw7ZybWV6LFxuICAgKiB5w7ZuZXRpbSBrb211dGxhcsSxIGBpbmNsdWRlSW5hY3RpdmVgIGlsZSBnw7ZyZWJpbGlyLlxuICAgKi9cbiAgcHVibGljIGZpbmRVc2VyKHVzZXJuYW1lOiBzdHJpbmcsIGluY2x1ZGVJbmFjdGl2ZSA9IGZhbHNlKTogVXNlciB8IG51bGwge1xuICAgIGlmICghdXNlcm5hbWUgfHwgdXNlcm5hbWUudHJpbSgpID09PSAnJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlciA9IHRoaXMudXNlcnMuZmluZChcbiAgICAgICh1KSA9PlxuICAgICAgICB1LnVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgPT09IHVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgJiZcbiAgICAgICAgKGluY2x1ZGVJbmFjdGl2ZSB8fCB1LmlzQWN0aXZlKSxcbiAgICApIGFzIFVzZXIgfCBudWxsO1xuXG4gICAgcmV0dXJuIHVzZXI7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgZWtsZVxuICAgKi9cbiAgcHVibGljIGFkZFVzZXIodXNlcm5hbWU6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZywgaG9tZURpcjogc3RyaW5nLCBwZXJtaXNzaW9uczogVXNlclBlcm1pc3Npb25zKTogYm9vbGVhbiB7XG4gICAgaWYgKCF1c2VybmFtZSkge1xuICAgICAgTG9nZ2VyLmVycm9yKGBbVXNlck1hbmFnZXJdIEludmFsaWQgdXNlcm5hbWVgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBLdWxsYW7EsWPEsSBhZMSxIHphdGVuIHZhcnNhIGtvbnRyb2wgZXQgKGRldnJlIGTEscWfxLEgaGVzYXBsYXIgZGFoaWwpXG4gICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lLCB0cnVlKTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIExvZ2dlci5lcnJvcihgW1VzZXJNYW5hZ2VyXSBVc2VyIGFscmVhZHkgZXhpc3RzOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld1VzZXI6IFVzZXIgPSB7XG4gICAgICB1c2VybmFtZSxcbiAgICAgIHBhc3N3b3JkLFxuICAgICAgaG9tZURpcjogcGF0aC5yZXNvbHZlKGhvbWVEaXIpLFxuICAgICAgcGVybWlzc2lvbnM6IHsgLi4ucGVybWlzc2lvbnMgfSxcbiAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgIH07XG5cbiAgICB0aGlzLnVzZXJzLnB1c2gobmV3VXNlcik7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIGNvbnN0IG9rID0gdGhpcy5kYi5hZGRVc2VyKHtcbiAgICAgICAgdXNlcm5hbWUsXG4gICAgICAgIHBhc3N3b3JkLFxuICAgICAgICBob21lRGlyOiBuZXdVc2VyLmhvbWVEaXIsXG4gICAgICAgIHBlcm1pc3Npb25zOiBuZXdVc2VyLnBlcm1pc3Npb25zIGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+LFxuICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgaWYgKCFvaykge1xuICAgICAgICBMb2dnZXIuZXJyb3IoYFtVc2VyTWFuYWdlcl0gRmFpbGVkIHRvIHBlcnNpc3QgdXNlcjogJHt1c2VybmFtZX1gKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIExvZ2dlci5pbmZvKGBbVXNlck1hbmFnZXJdIFVzZXIgYWRkZWQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgc2lsXG4gICAqL1xuICBwdWJsaWMgZGVsZXRlVXNlcih1c2VybmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUsIHRydWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy51c2VycyA9IHRoaXMudXNlcnMuZmlsdGVyKCh1KSA9PiB1LnVzZXJuYW1lICE9PSB1c2VybmFtZSk7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIHRoaXMuZGIuZGVsZXRlVXNlcih1c2VybmFtZSk7XG4gICAgfVxuXG4gICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gVXNlciBkZWxldGVkOiAke3VzZXJuYW1lfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGFrdGlmL3Bhc2lmIHlhcFxuICAgKi9cbiAgcHVibGljIHRvZ2dsZVVzZXJTdGF0dXModXNlcm5hbWU6IHN0cmluZywgaXNBY3RpdmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSwgdHJ1ZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBMb2dnZXIuaW5mbyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLmlzQWN0aXZlID0gaXNBY3RpdmU7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIHRoaXMuZGIudG9nZ2xlVXNlclN0YXR1cyh1c2VybmFtZSwgaXNBY3RpdmUpO1xuICAgIH1cblxuICAgIExvZ2dlci5pbmZvKGBbVXNlck1hbmFnZXJdIFVzZXIgc3RhdHVzIGNoYW5nZWQ6ICR7dXNlcm5hbWV9ICgke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAncGFzc2l2ZSd9KWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGl6aW5sZXJpbmkgZ8O8bmNlbGxlXG4gICAqL1xuICBwdWJsaWMgdXBkYXRlUGVybWlzc2lvbnModXNlcm5hbWU6IHN0cmluZywgcGVybWlzc2lvbnM6IFVzZXJQZXJtaXNzaW9ucyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lLCB0cnVlKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIExvZ2dlci5pbmZvKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE1ldmN1dCBpemlubGVyaSBrb3B5YWxhXG4gICAgY29uc3QgY3VycmVudFBlcm1pc3Npb25zID0gdXNlci5wZXJtaXNzaW9ucyB8fCB7fTtcblxuICAgIC8vIFllbmkgaXppbmxlcmkgYmlybGXFn3RpciAoeWVuaSBpemluIHZhcnNhIGfDvG5jZWxsZSwgeW9rc2EgbWV2Y3V0IGtvcnUpXG4gICAgY29uc3QgbmV3UGVybWlzc2lvbnMgPSB7XG4gICAgICAuLi5jdXJyZW50UGVybWlzc2lvbnMsXG4gICAgICAuLi5wZXJtaXNzaW9ucyxcbiAgICB9IGFzIFVzZXJQZXJtaXNzaW9ucztcblxuICAgIHVzZXIucGVybWlzc2lvbnMgPSBuZXdQZXJtaXNzaW9ucztcblxuICAgIGlmICh0aGlzLnBlcnNpc3QgJiYgdGhpcy5kYikge1xuICAgICAgdGhpcy5kYi51cGRhdGVQZXJtaXNzaW9ucyh1c2VybmFtZSwgbmV3UGVybWlzc2lvbnMgYXMgUmVjb3JkPHN0cmluZywgYm9vbGVhbj4pO1xuICAgIH1cblxuICAgIExvZ2dlci5pbmZvKGBbVXNlck1hbmFnZXJdIFBlcm1pc3Npb25zIHVwZGF0ZWQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgaXppbmxlcmluaSBrb250cm9sIGV0XG4gICAqL1xuICBwdWJsaWMgY2hlY2tQZXJtaXNzaW9uKHVzZXJuYW1lOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBMb2dnZXIuaW5mbyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBhY3Rpb24gPSBVc2VyTWFuYWdlci50b0xpbnV4QWN0aW9uKHBlcm1pc3Npb24pO1xuICAgIGNvbnN0IGhhc1Blcm1pc3Npb24gPSB1c2VyLnBlcm1pc3Npb25zPy5vd25lcj8uW2FjdGlvbl0gPT09IHRydWU7XG5cbiAgICBpZiAoIWhhc1Blcm1pc3Npb24pIHtcbiAgICAgIExvZ2dlci5pbmZvKGBbVXNlck1hbmFnZXJdIFBlcm1pc3Npb24gZGVuaWVkOiAke3VzZXJuYW1lfSAtICR7cGVybWlzc2lvbn1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gUGVybWlzc2lvbiBncmFudGVkOiAke3VzZXJuYW1lfSAtICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzUGVybWlzc2lvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUw7xtIGt1bGxhbsSxY8SxbGFyxLEgbGlzdGVsZSAoaW5jbHVkZUluYWN0aXZlOiBkZXZyZSBkxLHFn8SxIGhlc2FwbGFyIGRhKVxuICAgKi9cbiAgcHVibGljIGxpc3RVc2VycyhpbmNsdWRlSW5hY3RpdmUgPSBmYWxzZSk6IFVzZXJbXSB7XG4gICAgcmV0dXJuIGluY2x1ZGVJbmFjdGl2ZSA/IFsuLi50aGlzLnVzZXJzXSA6IHRoaXMudXNlcnMuZmlsdGVyKCh1KSA9PiB1LmlzQWN0aXZlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBpc3RhdGlzdGlrbGVyaVxuICAgKi9cbiAgcHVibGljIGdldFVzZXJTdGF0cygpOiBNYXA8c3RyaW5nLCBudW1iZXI+IHtcbiAgICBjb25zdCBzdGF0cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgdGhpcy51c2Vycy5mb3JFYWNoKCh1c2VyKSA9PiB7XG4gICAgICBzdGF0cy5zZXQodXNlci51c2VybmFtZSwgT2JqZWN0LmtleXModXNlci5wZXJtaXNzaW9ucyB8fCB7fSkubGVuZ3RoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gc3RhdHM7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgc2F5xLFzxLFuxLEgYWxcbiAgICovXG4gIHB1YmxpYyBnZXRVc2VyQ291bnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy51c2Vycy5maWx0ZXIoKHUpID0+IHUuaXNBY3RpdmUpLmxlbmd0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBhZMSxbsSxIGRlxJ9pxZ90aXJcbiAgICovXG4gIHB1YmxpYyBjaGFuZ2VVc2VybmFtZShvbGRVc2VybmFtZTogc3RyaW5nLCBuZXdVc2VybmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIob2xkVXNlcm5hbWUsIHRydWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7b2xkVXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gWWVuaSBrdWxsYW7EsWPEsSBhZMSxIHphdGVuIHZhcnNhIGtvbnRyb2wgZXRcbiAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZmluZFVzZXIobmV3VXNlcm5hbWUsIHRydWUpO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gVXNlcm5hbWUgYWxyZWFkeSBleGlzdHM6ICR7bmV3VXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdXNlci51c2VybmFtZSA9IG5ld1VzZXJuYW1lO1xuXG4gICAgaWYgKHRoaXMucGVyc2lzdCAmJiB0aGlzLmRiKSB7XG4gICAgICB0aGlzLmRiLmNoYW5nZVVzZXJuYW1lKG9sZFVzZXJuYW1lLCBuZXdVc2VybmFtZSk7XG4gICAgfVxuXG4gICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gVXNlcm5hbWUgY2hhbmdlZDogJHtvbGRVc2VybmFtZX0gLT4gJHtuZXdVc2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSDFn2lmcmVzaW5pIGRlxJ9pxZ90aXJcbiAgICovXG4gIHB1YmxpYyBjaGFuZ2VQYXNzd29yZCh1c2VybmFtZTogc3RyaW5nLCBuZXdQYXNzd29yZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUsIHRydWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdXNlci5wYXNzd29yZCA9IG5ld1Bhc3N3b3JkO1xuXG4gICAgaWYgKHRoaXMucGVyc2lzdCAmJiB0aGlzLmRiKSB7XG4gICAgICB0aGlzLmRiLmNoYW5nZVBhc3N3b3JkKHVzZXJuYW1lLCBuZXdQYXNzd29yZCk7XG4gICAgfVxuXG4gICAgTG9nZ2VyLmluZm8oYFtVc2VyTWFuYWdlcl0gUGFzc3dvcmQgY2hhbmdlZDogJHt1c2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBkaXppbmluaSBkZcSfacWfdGlyXG4gICAqL1xuICBwdWJsaWMgY2hhbmdlSG9tZURpcih1c2VybmFtZTogc3RyaW5nLCBuZXdIb21lRGlyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSwgdHJ1ZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBMb2dnZXIuaW5mbyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLmhvbWVEaXIgPSBwYXRoLnJlc29sdmUobmV3SG9tZURpcik7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIHRoaXMuZGIuY2hhbmdlSG9tZURpcih1c2VybmFtZSwgdXNlci5ob21lRGlyKTtcbiAgICB9XG5cbiAgICBMb2dnZXIuaW5mbyhgW1VzZXJNYW5hZ2VyXSBEaXJlY3RvcnkgY2hhbmdlZDogJHt1c2VybmFtZX0gLT4gJHt1c2VyLmhvbWVEaXJ9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogVmVyaXRhYmFuxLEgecO2bmV0aWNpc2luZSBlcmnFn2ltIChheWFybGFyIGnDp2luKVxuICAgKi9cbiAgcHVibGljIGdldERiKCk6IERhdGFiYXNlTWFuYWdlciB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmRiIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRlRQIGl6aW4gYW5haHRhcsSxbsSxIExpbnV4IGRvc3lhIGl6aW4gZXlsZW1pbmUgw6dldmlyaXIuXG4gICAqIEt1bGxhbsSxY8SxIGtlbmRpIGhvbWUgZGl6aW5pbmUgKG93bmVyKSBzYWhpcHRpcjsgRlRQIHNldml5ZXNpIGl6aW5sZXJpXG4gICAqIExpbnV4IG93bmVyIHBlcm1pc3Npb25zIG1hbnTEscSfxLF5bGEgZGXEn2VybGVuZGlyaWxpci5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgdG9MaW51eEFjdGlvbihwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogJ3JlYWQnIHwgJ3dyaXRlJyB8ICdleGVjdXRlJyB7XG4gICAgY29uc3QgcCA9IHBlcm1pc3Npb24gYXMgdW5rbm93biBhcyBzdHJpbmc7XG4gICAgaWYgKHAgPT09ICd3cml0ZScgfHwgcCA9PT0gJ2NyZWF0ZScgfHwgcCA9PT0gJ2FwcGVuZCcgfHwgcCA9PT0gJ2RlbGV0ZScgfHwgcCA9PT0gJ2NobW9kJyB8fCBwID09PSAnbWtkJyB8fCBwID09PSAncm1kaXInIHx8IHAgPT09ICdyZW5hbWUnIHx8IHAgPT09ICdkZWxldGVteWZpbGVzJykge1xuICAgICAgcmV0dXJuICd3cml0ZSc7XG4gICAgfVxuICAgIGlmIChwID09PSAnZXhlY3V0ZScpIHtcbiAgICAgIHJldHVybiAnZXhlY3V0ZSc7XG4gICAgfVxuICAgIGlmIChwID09PSAnbGlzdCcpIHtcbiAgICAgIHJldHVybiAncmVhZCc7XG4gICAgfVxuICAgIHJldHVybiAncmVhZCc7XG4gIH1cblxuICAvKipcbiAgICogVXNlck1hbmFnZXIgw7ZybmXEn2kgb2x1xZ90dXIgKHNpbmdsZXRvbilcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UoZGI6IERhdGFiYXNlTWFuYWdlcik6IFVzZXJNYW5hZ2VyIHtcbiAgICBpZiAoIVVzZXJNYW5hZ2VyLl9pbnN0YW5jZSkge1xuICAgICAgVXNlck1hbmFnZXIuX2luc3RhbmNlID0gbmV3IFVzZXJNYW5hZ2VyKGRiKTtcbiAgICB9XG4gICAgcmV0dXJuIFVzZXJNYW5hZ2VyLl9pbnN0YW5jZTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIF9pbnN0YW5jZTogVXNlck1hbmFnZXIgfCBudWxsID0gbnVsbDtcbn1cblxuLy8gU2luZ2xldG9uIGluc3RhbmNlIG9sdcWfdHVybWEgLSBkw7ZuZ8O8IGJhxJ/EsW1sxLFsxLHEn8SxbmRhbiBrYcOnxLFubWFrIGnDp2luXG5sZXQgdXNlck1hbmFnZXJJbnN0YW5jZTogVXNlck1hbmFnZXIgfCBudWxsID0gbnVsbDtcbmxldCB1c2VyTWFuYWdlckluaXRQcm9taXNlOiBQcm9taXNlPFVzZXJNYW5hZ2VyPiB8IG51bGwgPSBudWxsO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VXNlck1hbmFnZXIoZGI/OiBEYXRhYmFzZU1hbmFnZXIpOiBQcm9taXNlPFVzZXJNYW5hZ2VyPiB7XG4gIGlmICghdXNlck1hbmFnZXJJbml0UHJvbWlzZSkge1xuICAgIHVzZXJNYW5hZ2VySW5pdFByb21pc2UgPSAoYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKCF1c2VyTWFuYWdlckluc3RhbmNlKSB7XG4gICAgICAgIGlmICghZGIpIHtcbiAgICAgICAgICBkYiA9IG5ldyBEYXRhYmFzZU1hbmFnZXIoKTtcbiAgICAgICAgICBkYi5pbml0KCk7XG4gICAgICAgIH1cbiAgICAgICAgdXNlck1hbmFnZXJJbnN0YW5jZSA9IG5ldyBVc2VyTWFuYWdlcihkYik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXNlck1hbmFnZXJJbnN0YW5jZTtcbiAgICB9KSgpO1xuICB9XG4gIHJldHVybiB1c2VyTWFuYWdlckluaXRQcm9taXNlO1xufVxuIl19