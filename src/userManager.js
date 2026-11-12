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
const path = __importStar(require("path"));
const database_1 = require("./db/database");
const DEFAULT_USERS = [
    {
        username: 'anonim',
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
            console.log(`[UserManager] ${this.users.length} users loaded (in-memory)`);
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
                console.log(`[UserManager] Default ${this.users.length} users created in SQLite`);
            }
            else {
                console.log(`[UserManager] ${this.users.length} users loaded from SQLite`);
            }
        }
        catch (error) {
            console.error(`[UserManager] Load error:`);
            this.users = [...DEFAULT_USERS];
        }
    }
    findUser(username) {
        if (!username || username.trim() === '') {
            console.error(`[UserManager] User not found: ${username}`);
            return null;
        }
        const user = this.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.isActive);
        if (!user) {
            console.error(`[UserManager] User not found: ${username}`);
        }
        if (!user) {
            console.log(`[UserManager] Empty username or password`);
        }
        return user;
    }
    addUser(username, password, homeDir, permissions) {
        if (!username) {
            console.error(`[UserManager] Invalid username`);
            return false;
        }
        const existing = this.findUser(username);
        if (existing) {
            console.error(`[UserManager] User already exists: ${username}`);
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
                console.error(`[UserManager] Failed to persist user: ${username}`);
                return false;
            }
        }
        console.log(`[UserManager] User added: ${username}`);
        return true;
    }
    deleteUser(username) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
            return false;
        }
        this.users = this.users.filter((u) => u.username !== username);
        if (this.persist && this.db) {
            this.db.deleteUser(username);
        }
        console.log(`[UserManager] User deleted: ${username}`);
        return true;
    }
    toggleUserStatus(username, isActive) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
            return false;
        }
        user.isActive = isActive;
        if (this.persist && this.db) {
            this.db.toggleUserStatus(username, isActive);
        }
        console.log(`[UserManager] User status changed: ${username} (${isActive ? 'active' : 'passive'})`);
        return true;
    }
    updatePermissions(username, permissions) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
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
        console.log(`[UserManager] Permissions updated: ${username}`);
        return true;
    }
    checkPermission(username, permission) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
            return false;
        }
        const action = UserManager.toLinuxAction(permission);
        const hasPermission = user.permissions?.owner?.[action] === true;
        if (!hasPermission) {
            console.log(`[UserManager] Permission denied: ${username} - ${permission}`);
        }
        else {
            console.log(`[UserManager] Permission granted: ${username} - ${permission}`);
        }
        return hasPermission;
    }
    listUsers() {
        return this.users.filter((u) => u.isActive);
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
        const user = this.findUser(oldUsername);
        if (!user) {
            console.log(`[UserManager] User not found: ${oldUsername}`);
            return false;
        }
        const existing = this.findUser(newUsername);
        if (existing) {
            console.log(`[UserManager] Username already exists: ${newUsername}`);
            return false;
        }
        user.username = newUsername;
        if (this.persist && this.db) {
            this.db.changeUsername(oldUsername, newUsername);
        }
        console.log(`[UserManager] Username changed: ${oldUsername} -> ${newUsername}`);
        return true;
    }
    changePassword(username, newPassword) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
            return false;
        }
        user.password = newPassword;
        if (this.persist && this.db) {
            this.db.changePassword(username, newPassword);
        }
        console.log(`[UserManager] Password changed: ${username}`);
        return true;
    }
    changeHomeDir(username, newHomeDir) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
            return false;
        }
        user.homeDir = path.resolve(newHomeDir);
        if (this.persist && this.db) {
            this.db.changeHomeDir(username, user.homeDir);
        }
        console.log(`[UserManager] Directory changed: ${username} -> ${user.homeDir}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlck1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXNlck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksSUFBSSxpQ0FBYTtBQUU3Qiw0Q0FBZ0Q7QUFLaEQsTUFBTSxhQUFhLEdBQVc7SUFDNUI7UUFDRSxRQUFRLEVBQUUsUUFBUTtRQUNsQixRQUFRLEVBQUUsRUFBRTtRQUNaLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUMzQixXQUFXLEVBQUU7WUFDWCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUNsRCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUNsRCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtTQUNwRDtRQUNELFFBQVEsRUFBRSxJQUFJO0tBQ2Y7Q0FDRixDQUFDO0FBT0Y7SUFLRSxZQUFZLFFBQStCLEVBQUUsT0FBTyxHQUFZLElBQUk7UUFINUQsVUFBSyxHQUFXLEVBQUUsQ0FBQztRQUl6QixJQUFJLFFBQVEsWUFBWSwwQkFBZSxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDcEIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2QsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztZQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLElB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QUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUNELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQztJQUMvQixDQUFDO0NBR0Y7O0FBRGdCLHFCQUFTLEdBQXVCLElBQUksQUFBM0IsQ0FBNEI7QUFJdEQsSUFBSSxtQkFBbUIsR0FBdUIsSUFBSSxDQUFDO0FBQ25ELElBQUksc0JBQXNCLEdBQWdDLElBQUksQ0FBQztBQUV4RCxLQUFLLHlCQUF5QixFQUFvQjtJQUN2RCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM1QixzQkFBc0IsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ25DLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ1IsRUFBRSxHQUFHLElBQUksMEJBQWUsRUFBRSxDQUFDO29CQUMzQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1osQ0FBQztnQkFDRCxtQkFBbUIsR0FBRyxJQUFJLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QyxDQUFDO1lBQ0QsT0FBTyxtQkFBbUIsQ0FBQztRQUM3QixDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ1AsQ0FBQztJQUNELE9BQU8sc0JBQXNCLENBQUM7QUFDaEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBVc2VyLCBVc2VyUGVybWlzc2lvbnMsIFBlcm1pc3Npb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IERhdGFiYXNlTWFuYWdlciB9IGZyb20gJy4vZGIvZGF0YWJhc2UnO1xuXG4vKipcbiAqIERlZmF1bHQga3VsbGFuxLFjxLFsYXIgKHZlcml0YWJhbsSxIGJvxZ8gb2xkdcSfdW5kYSBpbGsgw6dhbMSxxZ90xLFybWFkYSBla2xlbmlyKVxuICovXG5jb25zdCBERUZBVUxUX1VTRVJTOiBVc2VyW10gPSBbXG4gIHtcbiAgICB1c2VybmFtZTogJ2Fub25pbScsXG4gICAgcGFzc3dvcmQ6ICcnLFxuICAgIGhvbWVEaXI6IHBhdGgucmVzb2x2ZSgnLi8nKSxcbiAgICBwZXJtaXNzaW9uczoge1xuICAgICAgb3duZXI6IHsgcmVhZDogdHJ1ZSwgd3JpdGU6IGZhbHNlLCBleGVjdXRlOiB0cnVlIH0sXG4gICAgICBncm91cDogeyByZWFkOiB0cnVlLCB3cml0ZTogZmFsc2UsIGV4ZWN1dGU6IHRydWUgfSxcbiAgICAgIG90aGVyczogeyByZWFkOiB0cnVlLCB3cml0ZTogZmFsc2UsIGV4ZWN1dGU6IHRydWUgfSxcbiAgICB9LFxuICAgIGlzQWN0aXZlOiB0cnVlLFxuICB9XG5dO1xuXG4vKipcbiAqIFVzZXJNYW5hZ2VyIGNsYXNzIC0gS3VsbGFuxLFjxLEgecO2bmV0aW1pXG4gKlxuICogS3VsbGFuxLFjxLFsYXIgYXJ0xLFrIEpTT04gZG9zeWFzxLEgeWVyaW5lIFNRTGl0ZSAndXNlcnMnIHRhYmxvc3VuZGEgdHV0dWx1ci5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZXJNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBkYjogRGF0YWJhc2VNYW5hZ2VyIHwgbnVsbDtcbiAgcHJpdmF0ZSB1c2VyczogVXNlcltdID0gW107XG4gIHByaXZhdGUgcGVyc2lzdDogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihkYk9yRGF0YTogRGF0YWJhc2VNYW5hZ2VyIHwgYW55LCBwZXJzaXN0OiBib29sZWFuID0gdHJ1ZSkge1xuICAgIGlmIChkYk9yRGF0YSBpbnN0YW5jZW9mIERhdGFiYXNlTWFuYWdlcikge1xuICAgICAgdGhpcy5kYiA9IGRiT3JEYXRhO1xuICAgICAgdGhpcy5wZXJzaXN0ID0gdHJ1ZTtcbiAgICAgIHRoaXMubG9hZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRiID0gbnVsbDtcbiAgICAgIHRoaXMucGVyc2lzdCA9IGZhbHNlO1xuICAgICAgdGhpcy51c2VycyA9IHRoaXMubm9ybWFsaXplRGF0YShkYk9yRGF0YSk7XG4gICAgICBpZiAoIXRoaXMudXNlcnMgfHwgdGhpcy51c2Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy51c2VycyA9IERFRkFVTFRfVVNFUlM7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSAke3RoaXMudXNlcnMubGVuZ3RofSB1c2VycyBsb2FkZWQgKGluLW1lbW9yeSlgKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2VsZW4geWFwxLFsYW5kxLFybWFzxLFuxLEgVXNlciBkaXppc2luZSBub3JtYWxpemUgZXRcbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplRGF0YShpbnB1dDogYW55KTogVXNlcltdIHtcbiAgICB0cnkge1xuICAgICAgaWYgKGlucHV0ICYmIEFycmF5LmlzQXJyYXkoaW5wdXQudXNlcnMpKSB7XG4gICAgICAgIHJldHVybiBpbnB1dC51c2VycyBhcyBVc2VyW107XG4gICAgICB9XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShpbnB1dCkpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0IGFzIFVzZXJbXTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnB1dCAmJiBpbnB1dC5kYXRhICYmIEFycmF5LmlzQXJyYXkoaW5wdXQuZGF0YS51c2VycykpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0LmRhdGEudXNlcnMgYXMgVXNlcltdO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIHlva3NheVxuICAgIH1cbiAgICByZXR1cm4gWy4uLkRFRkFVTFRfVVNFUlNdO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIHZlcmlsZXJpbmkgU1FMaXRlICd1c2VycycgdGFibG9zdW5kYW4gecO8a2xlXG4gICAqL1xuICBwcml2YXRlIGxvYWQoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRiID0gdGhpcy5kYiE7XG4gICAgICBjb25zdCBkYlVzZXJzID0gZGIuZ2V0QWxsVXNlcnMoKTtcbiAgICAgIHRoaXMudXNlcnMgPSBkYlVzZXJzLm1hcCgodSkgPT4gKHtcbiAgICAgICAgdXNlcm5hbWU6IHUudXNlcm5hbWUsXG4gICAgICAgIHBhc3N3b3JkOiB1LnBhc3N3b3JkLFxuICAgICAgICBob21lRGlyOiB1LmhvbWVEaXIsXG4gICAgICAgIHBlcm1pc3Npb25zOiB1LnBlcm1pc3Npb25zIGFzIFVzZXJQZXJtaXNzaW9ucyxcbiAgICAgICAgaXNBY3RpdmU6IHUuaXNBY3RpdmUsXG4gICAgICB9KSk7XG4gICAgICBpZiAodGhpcy51c2Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVmVyaXRhYmFuxLEgYm/Fn3NhIHZhcnNhecSxbGFuIGt1bGxhbsSxY8SxbGFyxLEgZWtsZVxuICAgICAgICBmb3IgKGNvbnN0IGRlZlVzZXIgb2YgREVGQVVMVF9VU0VSUykge1xuICAgICAgICAgIGRiLmFkZFVzZXIoe1xuICAgICAgICAgICAgdXNlcm5hbWU6IGRlZlVzZXIudXNlcm5hbWUsXG4gICAgICAgICAgICBwYXNzd29yZDogZGVmVXNlci5wYXNzd29yZCxcbiAgICAgICAgICAgIGhvbWVEaXI6IGRlZlVzZXIuaG9tZURpcixcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBkZWZVc2VyLnBlcm1pc3Npb25zIGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+LFxuICAgICAgICAgICAgaXNBY3RpdmU6IGRlZlVzZXIuaXNBY3RpdmUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51c2VycyA9IFsuLi5ERUZBVUxUX1VTRVJTXTtcbiAgICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gRGVmYXVsdCAke3RoaXMudXNlcnMubGVuZ3RofSB1c2VycyBjcmVhdGVkIGluIFNRTGl0ZWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gJHt0aGlzLnVzZXJzLmxlbmd0aH0gdXNlcnMgbG9hZGVkIGZyb20gU1FMaXRlYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtVc2VyTWFuYWdlcl0gTG9hZCBlcnJvcjpgKTtcbiAgICAgIHRoaXMudXNlcnMgPSBbLi4uREVGQVVMVF9VU0VSU107XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGJ1bFxuICAgKi9cbiAgcHVibGljIGZpbmRVc2VyKHVzZXJuYW1lOiBzdHJpbmcpOiBVc2VyIHwgbnVsbCB7XG4gICAgaWYgKCF1c2VybmFtZSB8fCB1c2VybmFtZS50cmltKCkgPT09ICcnKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlciA9IHRoaXMudXNlcnMuZmluZChcbiAgICAgICh1KSA9PiB1LnVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgPT09IHVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgJiYgdS5pc0FjdGl2ZVxuICAgICkgYXMgVXNlciB8IG51bGw7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgIH1cblxuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gRW1wdHkgdXNlcm5hbWUgb3IgcGFzc3dvcmRgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdXNlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBla2xlXG4gICAqL1xuICBwdWJsaWMgYWRkVXNlcih1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBob21lRGlyOiBzdHJpbmcsIHBlcm1pc3Npb25zOiBVc2VyUGVybWlzc2lvbnMpOiBib29sZWFuIHtcbiAgICBpZiAoIXVzZXJuYW1lKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIEludmFsaWQgdXNlcm5hbWVgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBLdWxsYW7EsWPEsSBhZMSxIHphdGVuIHZhcnNhIGtvbnRyb2wgZXRcbiAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgY29uc29sZS5lcnJvcihgW1VzZXJNYW5hZ2VyXSBVc2VyIGFscmVhZHkgZXhpc3RzOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld1VzZXI6IFVzZXIgPSB7XG4gICAgICB1c2VybmFtZSxcbiAgICAgIHBhc3N3b3JkLFxuICAgICAgaG9tZURpcjogcGF0aC5yZXNvbHZlKGhvbWVEaXIpLFxuICAgICAgcGVybWlzc2lvbnM6IHsgLi4ucGVybWlzc2lvbnMgfSxcbiAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgIH07XG5cbiAgICB0aGlzLnVzZXJzLnB1c2gobmV3VXNlcik7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIGNvbnN0IG9rID0gdGhpcy5kYi5hZGRVc2VyKHtcbiAgICAgICAgdXNlcm5hbWUsXG4gICAgICAgIHBhc3N3b3JkLFxuICAgICAgICBob21lRGlyOiBuZXdVc2VyLmhvbWVEaXIsXG4gICAgICAgIHBlcm1pc3Npb25zOiBuZXdVc2VyLnBlcm1pc3Npb25zIGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+LFxuICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgaWYgKCFvaykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIEZhaWxlZCB0byBwZXJzaXN0IHVzZXI6ICR7dXNlcm5hbWV9YCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIGFkZGVkOiAke3VzZXJuYW1lfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIHNpbFxuICAgKi9cbiAgcHVibGljIGRlbGV0ZVVzZXIodXNlcm5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMudXNlcnMgPSB0aGlzLnVzZXJzLmZpbHRlcigodSkgPT4gdS51c2VybmFtZSAhPT0gdXNlcm5hbWUpO1xuXG4gICAgaWYgKHRoaXMucGVyc2lzdCAmJiB0aGlzLmRiKSB7XG4gICAgICB0aGlzLmRiLmRlbGV0ZVVzZXIodXNlcm5hbWUpO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXIgZGVsZXRlZDogJHt1c2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBha3RpZi9wYXNpZiB5YXBcbiAgICovXG4gIHB1YmxpYyB0b2dnbGVVc2VyU3RhdHVzKHVzZXJuYW1lOiBzdHJpbmcsIGlzQWN0aXZlOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdXNlci5pc0FjdGl2ZSA9IGlzQWN0aXZlO1xuXG4gICAgaWYgKHRoaXMucGVyc2lzdCAmJiB0aGlzLmRiKSB7XG4gICAgICB0aGlzLmRiLnRvZ2dsZVVzZXJTdGF0dXModXNlcm5hbWUsIGlzQWN0aXZlKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIHN0YXR1cyBjaGFuZ2VkOiAke3VzZXJuYW1lfSAoJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJ3Bhc3NpdmUnfSlgKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBpemlubGVyaW5pIGfDvG5jZWxsZVxuICAgKi9cbiAgcHVibGljIHVwZGF0ZVBlcm1pc3Npb25zKHVzZXJuYW1lOiBzdHJpbmcsIHBlcm1pc3Npb25zOiBVc2VyUGVybWlzc2lvbnMpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBNZXZjdXQgaXppbmxlcmkga29weWFsYVxuICAgIGNvbnN0IGN1cnJlbnRQZXJtaXNzaW9ucyA9IHVzZXIucGVybWlzc2lvbnMgfHwge307XG5cbiAgICAvLyBZZW5pIGl6aW5sZXJpIGJpcmxlxZ90aXIgKHllbmkgaXppbiB2YXJzYSBnw7xuY2VsbGUsIHlva3NhIG1ldmN1dCBrb3J1KVxuICAgIGNvbnN0IG5ld1Blcm1pc3Npb25zID0ge1xuICAgICAgLi4uY3VycmVudFBlcm1pc3Npb25zLFxuICAgICAgLi4ucGVybWlzc2lvbnMsXG4gICAgfSBhcyBVc2VyUGVybWlzc2lvbnM7XG5cbiAgICB1c2VyLnBlcm1pc3Npb25zID0gbmV3UGVybWlzc2lvbnM7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIHRoaXMuZGIudXBkYXRlUGVybWlzc2lvbnModXNlcm5hbWUsIG5ld1Blcm1pc3Npb25zIGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+KTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBQZXJtaXNzaW9ucyB1cGRhdGVkOiAke3VzZXJuYW1lfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGl6aW5sZXJpbmkga29udHJvbCBldFxuICAgKi9cbiAgcHVibGljIGNoZWNrUGVybWlzc2lvbih1c2VybmFtZTogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgYWN0aW9uID0gVXNlck1hbmFnZXIudG9MaW51eEFjdGlvbihwZXJtaXNzaW9uKTtcbiAgICBjb25zdCBoYXNQZXJtaXNzaW9uID0gdXNlci5wZXJtaXNzaW9ucz8ub3duZXI/LlthY3Rpb25dID09PSB0cnVlO1xuXG4gICAgaWYgKCFoYXNQZXJtaXNzaW9uKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBQZXJtaXNzaW9uIGRlbmllZDogJHt1c2VybmFtZX0gLSAke3Blcm1pc3Npb259YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFBlcm1pc3Npb24gZ3JhbnRlZDogJHt1c2VybmFtZX0gLSAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhc1Blcm1pc3Npb247XG4gIH1cblxuICAvKipcbiAgICogVMO8bSBrdWxsYW7EsWPEsWxhcsSxIGxpc3RlbGVcbiAgICovXG4gIHB1YmxpYyBsaXN0VXNlcnMoKTogVXNlcltdIHtcbiAgICByZXR1cm4gdGhpcy51c2Vycy5maWx0ZXIoKHUpID0+IHUuaXNBY3RpdmUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGlzdGF0aXN0aWtsZXJpXG4gICAqL1xuICBwdWJsaWMgZ2V0VXNlclN0YXRzKCk6IE1hcDxzdHJpbmcsIG51bWJlcj4ge1xuICAgIGNvbnN0IHN0YXRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICB0aGlzLnVzZXJzLmZvckVhY2goKHVzZXIpID0+IHtcbiAgICAgIHN0YXRzLnNldCh1c2VyLnVzZXJuYW1lLCBPYmplY3Qua2V5cyh1c2VyLnBlcm1pc3Npb25zIHx8IHt9KS5sZW5ndGgpO1xuICAgIH0pO1xuICAgIHJldHVybiBzdGF0cztcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBzYXnEsXPEsW7EsSBhbFxuICAgKi9cbiAgcHVibGljIGdldFVzZXJDb3VudCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnVzZXJzLmZpbHRlcigodSkgPT4gdS5pc0FjdGl2ZSkubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGFkxLFuxLEgZGXEn2nFn3RpclxuICAgKi9cbiAgcHVibGljIGNoYW5nZVVzZXJuYW1lKG9sZFVzZXJuYW1lOiBzdHJpbmcsIG5ld1VzZXJuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcihvbGRVc2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHtvbGRVc2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBZZW5pIGt1bGxhbsSxY8SxIGFkxLEgemF0ZW4gdmFyc2Ega29udHJvbCBldFxuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5maW5kVXNlcihuZXdVc2VybmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VybmFtZSBhbHJlYWR5IGV4aXN0czogJHtuZXdVc2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLnVzZXJuYW1lID0gbmV3VXNlcm5hbWU7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIHRoaXMuZGIuY2hhbmdlVXNlcm5hbWUob2xkVXNlcm5hbWUsIG5ld1VzZXJuYW1lKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VybmFtZSBjaGFuZ2VkOiAke29sZFVzZXJuYW1lfSAtPiAke25ld1VzZXJuYW1lfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIMWfaWZyZXNpbmkgZGXEn2nFn3RpclxuICAgKi9cbiAgcHVibGljIGNoYW5nZVBhc3N3b3JkKHVzZXJuYW1lOiBzdHJpbmcsIG5ld1Bhc3N3b3JkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLnBhc3N3b3JkID0gbmV3UGFzc3dvcmQ7XG5cbiAgICBpZiAodGhpcy5wZXJzaXN0ICYmIHRoaXMuZGIpIHtcbiAgICAgIHRoaXMuZGIuY2hhbmdlUGFzc3dvcmQodXNlcm5hbWUsIG5ld1Bhc3N3b3JkKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBQYXNzd29yZCBjaGFuZ2VkOiAke3VzZXJuYW1lfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGRpemluaW5pIGRlxJ9pxZ90aXJcbiAgICovXG4gIHB1YmxpYyBjaGFuZ2VIb21lRGlyKHVzZXJuYW1lOiBzdHJpbmcsIG5ld0hvbWVEaXI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHVzZXIuaG9tZURpciA9IHBhdGgucmVzb2x2ZShuZXdIb21lRGlyKTtcblxuICAgIGlmICh0aGlzLnBlcnNpc3QgJiYgdGhpcy5kYikge1xuICAgICAgdGhpcy5kYi5jaGFuZ2VIb21lRGlyKHVzZXJuYW1lLCB1c2VyLmhvbWVEaXIpO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIERpcmVjdG9yeSBjaGFuZ2VkOiAke3VzZXJuYW1lfSAtPiAke3VzZXIuaG9tZURpcn1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpdGFiYW7EsSB5w7ZuZXRpY2lzaW5lIGVyacWfaW0gKGF5YXJsYXIgacOnaW4pXG4gICAqL1xuICBwdWJsaWMgZ2V0RGIoKTogRGF0YWJhc2VNYW5hZ2VyIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZGIgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGVFAgaXppbiBhbmFodGFyxLFuxLEgTGludXggZG9zeWEgaXppbiBleWxlbWluZSDDp2V2aXJpci5cbiAgICogS3VsbGFuxLFjxLEga2VuZGkgaG9tZSBkaXppbmluZSAob3duZXIpIHNhaGlwdGlyOyBGVFAgc2V2aXllc2kgaXppbmxlcmlcbiAgICogTGludXggb3duZXIgcGVybWlzc2lvbnMgbWFudMSxxJ/EsXlsYSBkZcSfZXJsZW5kaXJpbGlyLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyB0b0xpbnV4QWN0aW9uKHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiAncmVhZCcgfCAnd3JpdGUnIHwgJ2V4ZWN1dGUnIHtcbiAgICBjb25zdCBwID0gcGVybWlzc2lvbiBhcyB1bmtub3duIGFzIHN0cmluZztcbiAgICBpZiAocCA9PT0gJ3dyaXRlJyB8fCBwID09PSAnY3JlYXRlJyB8fCBwID09PSAnYXBwZW5kJyB8fCBwID09PSAnZGVsZXRlJyB8fCBwID09PSAnY2htb2QnIHx8IHAgPT09ICdta2QnIHx8IHAgPT09ICdybWRpcicgfHwgcCA9PT0gJ3JlbmFtZScgfHwgcCA9PT0gJ2RlbGV0ZW15ZmlsZXMnKSB7XG4gICAgICByZXR1cm4gJ3dyaXRlJztcbiAgICB9XG4gICAgaWYgKHAgPT09ICdleGVjdXRlJykge1xuICAgICAgcmV0dXJuICdleGVjdXRlJztcbiAgICB9XG4gICAgaWYgKHAgPT09ICdsaXN0Jykge1xuICAgICAgcmV0dXJuICdyZWFkJztcbiAgICB9XG4gICAgcmV0dXJuICdyZWFkJztcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VyTWFuYWdlciDDtnJuZcSfaSBvbHXFn3R1ciAoc2luZ2xldG9uKVxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZShkYjogRGF0YWJhc2VNYW5hZ2VyKTogVXNlck1hbmFnZXIge1xuICAgIGlmICghVXNlck1hbmFnZXIuX2luc3RhbmNlKSB7XG4gICAgICBVc2VyTWFuYWdlci5faW5zdGFuY2UgPSBuZXcgVXNlck1hbmFnZXIoZGIpO1xuICAgIH1cbiAgICByZXR1cm4gVXNlck1hbmFnZXIuX2luc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgX2luc3RhbmNlOiBVc2VyTWFuYWdlciB8IG51bGwgPSBudWxsO1xufVxuXG4vLyBTaW5nbGV0b24gaW5zdGFuY2Ugb2x1xZ90dXJtYSAtIGTDtm5nw7wgYmHEn8SxbWzEsWzEscSfxLFuZGFuIGthw6fEsW5tYWsgacOnaW5cbmxldCB1c2VyTWFuYWdlckluc3RhbmNlOiBVc2VyTWFuYWdlciB8IG51bGwgPSBudWxsO1xubGV0IHVzZXJNYW5hZ2VySW5pdFByb21pc2U6IFByb21pc2U8VXNlck1hbmFnZXI+IHwgbnVsbCA9IG51bGw7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVc2VyTWFuYWdlcihkYj86IERhdGFiYXNlTWFuYWdlcik6IFByb21pc2U8VXNlck1hbmFnZXI+IHtcbiAgaWYgKCF1c2VyTWFuYWdlckluaXRQcm9taXNlKSB7XG4gICAgdXNlck1hbmFnZXJJbml0UHJvbWlzZSA9IChhc3luYyAoKSA9PiB7XG4gICAgICBpZiAoIXVzZXJNYW5hZ2VySW5zdGFuY2UpIHtcbiAgICAgICAgaWYgKCFkYikge1xuICAgICAgICAgIGRiID0gbmV3IERhdGFiYXNlTWFuYWdlcigpO1xuICAgICAgICAgIGRiLmluaXQoKTtcbiAgICAgICAgfVxuICAgICAgICB1c2VyTWFuYWdlckluc3RhbmNlID0gbmV3IFVzZXJNYW5hZ2VyKGRiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1c2VyTWFuYWdlckluc3RhbmNlO1xuICAgIH0pKCk7XG4gIH1cbiAgcmV0dXJuIHVzZXJNYW5hZ2VySW5pdFByb21pc2U7XG59XG4iXX0=