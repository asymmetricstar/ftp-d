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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_USERS = [
    {
        username: 'admin',
        password: 'admin',
        homeDir: path.join(__dirname, '../files/admin'),
        permissions: {
            read: true,
            write: true,
            list: true,
            create: true,
            append: true,
            delete: true,
            chmod: true,
            mkd: true,
            rmdir: true,
            rename: true,
            deletemyfiles: true,
        },
        isActive: true,
    }
];
class UserManager {
    constructor(userFile) {
        this.users = [];
        if (typeof userFile === 'string') {
            this.userFile = userFile;
            this.persist = true;
            this.load();
        }
        else {
            this.userFile = null;
            this.persist = false;
            this.data = this.normalizeData(userFile);
            this.users = this.data.users || [];
            if (!this.users || this.users.length === 0) {
                this.users = DEFAULT_USERS;
                this.data = { users: DEFAULT_USERS, lastUpdated: new Date().toISOString() };
            }
            console.log(`[UserManager] ${this.users.length} users loaded (in-memory)`);
        }
    }
    normalizeData(input) {
        try {
            if (input && Array.isArray(input.users)) {
                return {
                    users: input.users,
                    lastUpdated: input.lastUpdated || new Date().toISOString(),
                };
            }
            if (Array.isArray(input)) {
                return {
                    users: input,
                    lastUpdated: new Date().toISOString(),
                };
            }
            if (input && input.data && Array.isArray(input.data.users)) {
                return {
                    users: input.data.users,
                    lastUpdated: input.data.lastUpdated || new Date().toISOString(),
                };
            }
        }
        catch (e) {
        }
        return { users: DEFAULT_USERS, lastUpdated: new Date().toISOString() };
    }
    load() {
        try {
            if (this.userFile && fs.existsSync(this.userFile)) {
                const content = fs.readFileSync(this.userFile, 'utf-8');
                this.data = JSON.parse(content);
                this.users = this.data.users || [];
                console.log(`[UserManager] ${this.users.length} users loaded`);
            }
            else {
                this.data = {
                    users: DEFAULT_USERS,
                    lastUpdated: new Date().toISOString(),
                };
                this.users = DEFAULT_USERS;
                this.save();
                console.log(`[UserManager] Default ${this.users.length} users created`);
            }
        }
        catch (error) {
            console.error(`[UserManager] Load error:`);
            this.users = DEFAULT_USERS;
            this.data = {
                users: DEFAULT_USERS,
                lastUpdated: new Date().toISOString(),
            };
        }
    }
    save() {
        if (!this.persist || !this.userFile) {
            return;
        }
        try {
            this.data.lastUpdated = new Date().toISOString();
            fs.writeFileSync(this.userFile, JSON.stringify(this.data, null, 2));
            console.log(`[UserManager] Data saved`);
        }
        catch (error) {
            console.error(`[UserManager] Save error:`, error);
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
        if (!username || !password) {
            console.error(`[UserManager] User already exists: ${username}`);
            return false;
        }
        const existing = this.findUser(username);
        if (existing) {
            console.log(`[UserManager] User added: ${username}`);
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
        this.save();
        console.log(`[UserManager] User not found: ${username}`);
        return true;
    }
    deleteUser(username) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User deleted: ${username}`);
            return false;
        }
        this.users = this.users.filter((u) => u.username !== username);
        this.save();
        console.log(`[UserManager] User not found: ${username}`);
        return true;
    }
    toggleUserStatus(username, isActive) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User status changed: ${username} (${isActive ? 'active' : 'passive'})`);
            return false;
        }
        user.isActive = isActive;
        this.save();
        console.log(`[UserManager] User not found: ${username}`);
        return true;
    }
    updatePermissions(username, permissions) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] Permissions updated: ${username}`);
            return false;
        }
        const currentPermissions = user.permissions || {};
        const newPermissions = {
            ...currentPermissions,
            ...permissions,
        };
        user.permissions = newPermissions;
        this.save();
        console.log(`[UserManager] Permission check failed - user not found: ${username}`);
        return true;
    }
    checkPermission(username, permission) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
            return false;
        }
        const hasPermission = user.permissions?.[permission] === true;
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
            console.log(`[UserManager] Username already exists: ${newUsername}`);
            return false;
        }
        const existing = this.findUser(newUsername);
        if (existing) {
            console.log(`[UserManager] Username already exists: ${newUsername}`);
            return false;
        }
        user.username = newUsername;
        this.save();
        console.log(`[UserManager] Username changed: ${oldUsername} -> ${newUsername}`);
        return true;
    }
    changePassword(username, newPassword) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] Password changed: ${username}`);
            return false;
        }
        user.password = newPassword;
        this.save();
        console.log(`[UserManager] User not found: ${username}`);
        return true;
    }
    changeHomeDir(username, newHomeDir) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] User not found: ${username}`);
            return false;
        }
        user.homeDir = path.resolve(newHomeDir);
        this.save();
        console.log(`[UserManager] Directory changed: ${username} -> ${user.homeDir}`);
        return true;
    }
    static getInstance(userFile) {
        if (!UserManager._instance) {
            UserManager._instance = new UserManager(userFile);
        }
        return UserManager._instance;
    }
}
exports.UserManager = UserManager;
UserManager._instance = null;
let userManagerInstance = null;
let userManagerInitPromise = null;
async function getUserManager(userFile) {
    if (!userManagerInitPromise) {
        userManagerInitPromise = (async () => {
            if (!userManagerInstance) {
                if (!userFile) {
                    userFile = path.join(__dirname, '../users.json');
                }
                userManagerInstance = new UserManager(userFile);
            }
            return userManagerInstance;
        })();
    }
    return userManagerInitPromise;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlck1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXNlck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLElBQUksaUNBQWE7QUFNN0IsTUFBTSxhQUFhLEdBQVc7SUFDNUI7UUFDRSxRQUFRLEVBQUUsT0FBTztRQUNqQixRQUFRLEVBQUUsT0FBTztRQUNqQixPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUM7UUFDL0MsV0FBVyxFQUFFO1lBQ1gsSUFBSSxFQUFFLElBQUk7WUFDVixLQUFLLEVBQUUsSUFBSTtZQUNYLElBQUksRUFBRSxJQUFJO1lBQ1YsTUFBTSxFQUFFLElBQUk7WUFDWixNQUFNLEVBQUUsSUFBSTtZQUNaLE1BQU0sRUFBRSxJQUFJO1lBQ1osS0FBSyxFQUFFLElBQUk7WUFDWCxHQUFHLEVBQUUsSUFBSTtZQUNULEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTSxFQUFFLElBQUk7WUFDWixhQUFhLEVBQUUsSUFBSTtTQUNwQjtRQUNELFFBQVEsRUFBRSxJQUFJO0tBQ2Y7Q0FDRixDQUFDO0FBS0Y7SUFNRSxZQUFZLFFBQXdDO1FBSDVDLFVBQUssR0FBVyxFQUFFLENBQUM7UUFJekIsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNwQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZCxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxJQUFJLEdB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QztRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxRQUFRLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDL0UsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBS00sTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFnQjtRQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQztJQUMvQixDQUFDO0NBR0Y7O0FBRGdCLHFCQUFTLEdBQXVCLElBQUksQUFBM0IsQ0FBNEI7QUFJdEQsSUFBSSxtQkFBbUIsR0FBdUIsSUFBSSxDQUFDO0FBQ25ELElBQUksc0JBQXNCLEdBQWdDLElBQUksQ0FBQztBQUV4RCxLQUFLLHlCQUF5QixRQUFpQjtJQUNwRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM1QixzQkFBc0IsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ25DLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2QsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUNuRCxDQUFDO2dCQUNELG1CQUFtQixHQUFHLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELENBQUM7WUFDRCxPQUFPLG1CQUFtQixDQUFDO1FBQzdCLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDUCxDQUFDO0lBQ0QsT0FBTyxzQkFBc0IsQ0FBQztBQUNoQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFVzZXIsIFVzZXJQZXJtaXNzaW9ucywgVXNlck1hbmFnZXJEYXRhLCBQZXJtaXNzaW9uIH0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogRGVmYXVsdCBrdWxsYW7EsWPEsWxhclxuICovXG5jb25zdCBERUZBVUxUX1VTRVJTOiBVc2VyW10gPSBbXG4gIHtcbiAgICB1c2VybmFtZTogJ2FkbWluJyxcbiAgICBwYXNzd29yZDogJ2FkbWluJyxcbiAgICBob21lRGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZmlsZXMvYWRtaW4nKSxcbiAgICBwZXJtaXNzaW9uczoge1xuICAgICAgcmVhZDogdHJ1ZSxcbiAgICAgIHdyaXRlOiB0cnVlLFxuICAgICAgbGlzdDogdHJ1ZSxcbiAgICAgIGNyZWF0ZTogdHJ1ZSxcbiAgICAgIGFwcGVuZDogdHJ1ZSxcbiAgICAgIGRlbGV0ZTogdHJ1ZSxcbiAgICAgIGNobW9kOiB0cnVlLFxuICAgICAgbWtkOiB0cnVlLFxuICAgICAgcm1kaXI6IHRydWUsXG4gICAgICByZW5hbWU6IHRydWUsXG4gICAgICBkZWxldGVteWZpbGVzOiB0cnVlLFxuICAgIH0sXG4gICAgaXNBY3RpdmU6IHRydWUsXG4gIH1cbl07XG5cbi8qKlxuICogVXNlck1hbmFnZXIgY2xhc3MgLSBLdWxsYW7EsWPEsSB5w7ZuZXRpbWlcbiAqL1xuZXhwb3J0IGNsYXNzIFVzZXJNYW5hZ2VyIHtcbiAgcHJpdmF0ZSB1c2VyRmlsZTogc3RyaW5nIHwgbnVsbDtcbiAgcHJpdmF0ZSBwZXJzaXN0OiBib29sZWFuO1xuICBwcml2YXRlIHVzZXJzOiBVc2VyW10gPSBbXTtcbiAgcHJpdmF0ZSBkYXRhOiBVc2VyTWFuYWdlckRhdGE7XG5cbiAgY29uc3RydWN0b3IodXNlckZpbGU6IHN0cmluZyB8IFVzZXJNYW5hZ2VyRGF0YSB8IGFueSkge1xuICAgIGlmICh0eXBlb2YgdXNlckZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnVzZXJGaWxlID0gdXNlckZpbGU7XG4gICAgICB0aGlzLnBlcnNpc3QgPSB0cnVlO1xuICAgICAgdGhpcy5sb2FkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXNlckZpbGUgPSBudWxsO1xuICAgICAgdGhpcy5wZXJzaXN0ID0gZmFsc2U7XG4gICAgICB0aGlzLmRhdGEgPSB0aGlzLm5vcm1hbGl6ZURhdGEodXNlckZpbGUpO1xuICAgICAgdGhpcy51c2VycyA9IHRoaXMuZGF0YS51c2VycyB8fCBbXTtcbiAgICAgIGlmICghdGhpcy51c2VycyB8fCB0aGlzLnVzZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aGlzLnVzZXJzID0gREVGQVVMVF9VU0VSUztcbiAgICAgICAgdGhpcy5kYXRhID0geyB1c2VyczogREVGQVVMVF9VU0VSUywgbGFzdFVwZGF0ZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSB9O1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gJHt0aGlzLnVzZXJzLmxlbmd0aH0gdXNlcnMgbG9hZGVkIChpbi1tZW1vcnkpYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbGVuIHlhcMSxbGFuZMSxcm1hc8SxbsSxIFVzZXJNYW5hZ2VyRGF0YSBiacOnaW1pbmUgbm9ybWFsaXplIGV0XG4gICAqL1xuICBwcml2YXRlIG5vcm1hbGl6ZURhdGEoaW5wdXQ6IGFueSk6IFVzZXJNYW5hZ2VyRGF0YSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChpbnB1dCAmJiBBcnJheS5pc0FycmF5KGlucHV0LnVzZXJzKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJzOiBpbnB1dC51c2VycyxcbiAgICAgICAgICBsYXN0VXBkYXRlZDogaW5wdXQubGFzdFVwZGF0ZWQgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdXNlcnM6IGlucHV0IGFzIFVzZXJbXSxcbiAgICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKGlucHV0ICYmIGlucHV0LmRhdGEgJiYgQXJyYXkuaXNBcnJheShpbnB1dC5kYXRhLnVzZXJzKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJzOiBpbnB1dC5kYXRhLnVzZXJzLFxuICAgICAgICAgIGxhc3RVcGRhdGVkOiBpbnB1dC5kYXRhLmxhc3RVcGRhdGVkIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB5b2tzYXlcbiAgICB9XG4gICAgcmV0dXJuIHsgdXNlcnM6IERFRkFVTFRfVVNFUlMsIGxhc3RVcGRhdGVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSB2ZXJpbGVyaW5pIHnDvGtsZVxuICAgKi9cbiAgcHJpdmF0ZSBsb2FkKCk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy51c2VyRmlsZSAmJiBmcy5leGlzdHNTeW5jKHRoaXMudXNlckZpbGUpKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmModGhpcy51c2VyRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgIHRoaXMuZGF0YSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgIHRoaXMudXNlcnMgPSB0aGlzLmRhdGEudXNlcnMgfHwgW107XG4gICAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdICR7dGhpcy51c2Vycy5sZW5ndGh9IHVzZXJzIGxvYWRlZGApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVmFyc2F5xLFsYW4ga3VsbGFuxLFjxLFsYXLEsSBvbHXFn3R1clxuICAgICAgICB0aGlzLmRhdGEgPSB7XG4gICAgICAgICAgdXNlcnM6IERFRkFVTFRfVVNFUlMsXG4gICAgICAgICAgbGFzdFVwZGF0ZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy51c2VycyA9IERFRkFVTFRfVVNFUlM7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBEZWZhdWx0ICR7dGhpcy51c2Vycy5sZW5ndGh9IHVzZXJzIGNyZWF0ZWRgKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihgW1VzZXJNYW5hZ2VyXSBMb2FkIGVycm9yOmApO1xuICAgICAgdGhpcy51c2VycyA9IERFRkFVTFRfVVNFUlM7XG4gICAgICB0aGlzLmRhdGEgPSB7XG4gICAgICAgIHVzZXJzOiBERUZBVUxUX1VTRVJTLFxuICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgdmVyaWxlcmluaSBrYXlkZXRcbiAgICovXG4gIHByaXZhdGUgc2F2ZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucGVyc2lzdCB8fCAhdGhpcy51c2VyRmlsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgdGhpcy5kYXRhLmxhc3RVcGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0aGlzLnVzZXJGaWxlLCBKU09OLnN0cmluZ2lmeSh0aGlzLmRhdGEsIG51bGwsIDIpKTtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIERhdGEgc2F2ZWRgKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihgW1VzZXJNYW5hZ2VyXSBTYXZlIGVycm9yOmAsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgYnVsXG4gICAqL1xuICBwdWJsaWMgZmluZFVzZXIodXNlcm5hbWU6IHN0cmluZyk6IFVzZXIgfCBudWxsIHtcbiAgICBpZiAoIXVzZXJuYW1lIHx8IHVzZXJuYW1lLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB1c2VyID0gdGhpcy51c2Vycy5maW5kKFxuICAgICAgKHUpID0+IHUudXNlcm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gdXNlcm5hbWUudG9Mb3dlckNhc2UoKSAmJiB1LmlzQWN0aXZlXG4gICAgKSBhcyBVc2VyIHwgbnVsbDtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgfVxuXG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBFbXB0eSB1c2VybmFtZSBvciBwYXNzd29yZGApO1xuICAgIH1cblxuICAgIHJldHVybiB1c2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGVrbGVcbiAgICovXG4gIHB1YmxpYyBhZGRVc2VyKHVzZXJuYW1lOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcsIGhvbWVEaXI6IHN0cmluZywgcGVybWlzc2lvbnM6IFVzZXJQZXJtaXNzaW9ucyk6IGJvb2xlYW4ge1xuICAgIGlmICghdXNlcm5hbWUgfHwgIXBhc3N3b3JkKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIFVzZXIgYWxyZWFkeSBleGlzdHM6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gS3VsbGFuxLFjxLEgYWTEsSB6YXRlbiB2YXJzYSBrb250cm9sIGV0XG4gICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lKTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXIgYWRkZWQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3VXNlcjogVXNlciA9IHtcbiAgICAgIHVzZXJuYW1lLFxuICAgICAgcGFzc3dvcmQsXG4gICAgICBob21lRGlyOiBwYXRoLnJlc29sdmUoaG9tZURpciksXG4gICAgICBwZXJtaXNzaW9uczogeyAuLi5wZXJtaXNzaW9ucyB9LFxuICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgfTtcblxuICAgIHRoaXMudXNlcnMucHVzaChuZXdVc2VyKTtcbiAgICB0aGlzLnNhdmUoKTtcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBzaWxcbiAgICovXG4gIHB1YmxpYyBkZWxldGVVc2VyKHVzZXJuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIGRlbGV0ZWQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy51c2VycyA9IHRoaXMudXNlcnMuZmlsdGVyKCh1KSA9PiB1LnVzZXJuYW1lICE9PSB1c2VybmFtZSk7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgYWt0aWYvcGFzaWYgeWFwXG4gICAqL1xuICBwdWJsaWMgdG9nZ2xlVXNlclN0YXR1cyh1c2VybmFtZTogc3RyaW5nLCBpc0FjdGl2ZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXIgc3RhdHVzIGNoYW5nZWQ6ICR7dXNlcm5hbWV9ICgke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAncGFzc2l2ZSd9KWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHVzZXIuaXNBY3RpdmUgPSBpc0FjdGl2ZTtcbiAgICB0aGlzLnNhdmUoKTtcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBpemlubGVyaW5pIGfDvG5jZWxsZVxuICAgKi9cbiAgcHVibGljIHVwZGF0ZVBlcm1pc3Npb25zKHVzZXJuYW1lOiBzdHJpbmcsIHBlcm1pc3Npb25zOiBVc2VyUGVybWlzc2lvbnMpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBQZXJtaXNzaW9ucyB1cGRhdGVkOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE1ldmN1dCBpemlubGVyaSBrb3B5YWxhXG4gICAgY29uc3QgY3VycmVudFBlcm1pc3Npb25zID0gdXNlci5wZXJtaXNzaW9ucyB8fCB7fTtcbiAgICBcbiAgICAvLyBZZW5pIGl6aW5sZXJpIGJpcmxlxZ90aXIgKHllbmkgaXppbiB2YXJzYSBnw7xuY2VsbGUsIHlva3NhIG1ldmN1dCBrb3J1KVxuICAgIGNvbnN0IG5ld1Blcm1pc3Npb25zID0ge1xuICAgICAgLi4uY3VycmVudFBlcm1pc3Npb25zLFxuICAgICAgLi4ucGVybWlzc2lvbnMsXG4gICAgfSBhcyBVc2VyUGVybWlzc2lvbnM7XG5cbiAgICB1c2VyLnBlcm1pc3Npb25zID0gbmV3UGVybWlzc2lvbnM7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gUGVybWlzc2lvbiBjaGVjayBmYWlsZWQgLSB1c2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBpemlubGVyaW5pIGtvbnRyb2wgZXRcbiAgICovXG4gIHB1YmxpYyBjaGVja1Blcm1pc3Npb24odXNlcm5hbWU6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IGhhc1Blcm1pc3Npb24gPSB1c2VyLnBlcm1pc3Npb25zPy5bcGVybWlzc2lvbl0gPT09IHRydWU7XG5cbiAgICBpZiAoIWhhc1Blcm1pc3Npb24pIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFBlcm1pc3Npb24gZGVuaWVkOiAke3VzZXJuYW1lfSAtICR7cGVybWlzc2lvbn1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gUGVybWlzc2lvbiBncmFudGVkOiAke3VzZXJuYW1lfSAtICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzUGVybWlzc2lvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUw7xtIGt1bGxhbsSxY8SxbGFyxLEgbGlzdGVsZVxuICAgKi9cbiAgcHVibGljIGxpc3RVc2VycygpOiBVc2VyW10ge1xuICAgIHJldHVybiB0aGlzLnVzZXJzLmZpbHRlcigodSkgPT4gdS5pc0FjdGl2ZSk7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgaXN0YXRpc3Rpa2xlcmlcbiAgICovXG4gIHB1YmxpYyBnZXRVc2VyU3RhdHMoKTogTWFwPHN0cmluZywgbnVtYmVyPiB7XG4gICAgY29uc3Qgc3RhdHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICAgIHRoaXMudXNlcnMuZm9yRWFjaCgodXNlcikgPT4ge1xuICAgICAgc3RhdHMuc2V0KHVzZXIudXNlcm5hbWUsIE9iamVjdC5rZXlzKHVzZXIucGVybWlzc2lvbnMgfHwge30pLmxlbmd0aCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0YXRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIHNhecSxc8SxbsSxIGFsXG4gICAqL1xuICBwdWJsaWMgZ2V0VXNlckNvdW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMudXNlcnMuZmlsdGVyKCh1KSA9PiB1LmlzQWN0aXZlKS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgYWTEsW7EsSBkZcSfacWfdGlyXG4gICAqL1xuICBwdWJsaWMgY2hhbmdlVXNlcm5hbWUob2xkVXNlcm5hbWU6IHN0cmluZywgbmV3VXNlcm5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKG9sZFVzZXJuYW1lKTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXJuYW1lIGFscmVhZHkgZXhpc3RzOiAke25ld1VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFllbmkga3VsbGFuxLFjxLEgYWTEsSB6YXRlbiB2YXJzYSBrb250cm9sIGV0XG4gICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmZpbmRVc2VyKG5ld1VzZXJuYW1lKTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXJuYW1lIGFscmVhZHkgZXhpc3RzOiAke25ld1VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHVzZXIudXNlcm5hbWUgPSBuZXdVc2VybmFtZTtcbiAgICB0aGlzLnNhdmUoKTtcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VybmFtZSBjaGFuZ2VkOiAke29sZFVzZXJuYW1lfSAtPiAke25ld1VzZXJuYW1lfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIMWfaWZyZXNpbmkgZGXEn2nFn3RpclxuICAgKi9cbiAgcHVibGljIGNoYW5nZVBhc3N3b3JkKHVzZXJuYW1lOiBzdHJpbmcsIG5ld1Bhc3N3b3JkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBQYXNzd29yZCBjaGFuZ2VkOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHVzZXIucGFzc3dvcmQgPSBuZXdQYXNzd29yZDtcbiAgICB0aGlzLnNhdmUoKTtcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBkaXppbmluaSBkZcSfacWfdGlyXG4gICAqL1xuICBwdWJsaWMgY2hhbmdlSG9tZURpcih1c2VybmFtZTogc3RyaW5nLCBuZXdIb21lRGlyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLmhvbWVEaXIgPSBwYXRoLnJlc29sdmUobmV3SG9tZURpcik7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gRGlyZWN0b3J5IGNoYW5nZWQ6ICR7dXNlcm5hbWV9IC0+ICR7dXNlci5ob21lRGlyfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFVzZXJNYW5hZ2VyIMO2cm5lxJ9pIG9sdcWfdHVyIChzaW5nbGV0b24pXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKHVzZXJGaWxlOiBzdHJpbmcpOiBVc2VyTWFuYWdlciB7XG4gICAgaWYgKCFVc2VyTWFuYWdlci5faW5zdGFuY2UpIHtcbiAgICAgIFVzZXJNYW5hZ2VyLl9pbnN0YW5jZSA9IG5ldyBVc2VyTWFuYWdlcih1c2VyRmlsZSk7XG4gICAgfVxuICAgIHJldHVybiBVc2VyTWFuYWdlci5faW5zdGFuY2U7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBfaW5zdGFuY2U6IFVzZXJNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG59XG5cbi8vIFNpbmdsZXRvbiBpbnN0YW5jZSBvbHXFn3R1cm1hIC0gZMO2bmfDvCBiYcSfxLFtbMSxbMSxxJ/EsW5kYW4ga2HDp8Sxbm1hayBpw6dpblxubGV0IHVzZXJNYW5hZ2VySW5zdGFuY2U6IFVzZXJNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG5sZXQgdXNlck1hbmFnZXJJbml0UHJvbWlzZTogUHJvbWlzZTxVc2VyTWFuYWdlcj4gfCBudWxsID0gbnVsbDtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJNYW5hZ2VyKHVzZXJGaWxlPzogc3RyaW5nKTogUHJvbWlzZTxVc2VyTWFuYWdlcj4ge1xuICBpZiAoIXVzZXJNYW5hZ2VySW5pdFByb21pc2UpIHtcbiAgICB1c2VyTWFuYWdlckluaXRQcm9taXNlID0gKGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghdXNlck1hbmFnZXJJbnN0YW5jZSkge1xuICAgICAgICBpZiAoIXVzZXJGaWxlKSB7XG4gICAgICAgICAgdXNlckZpbGUgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vdXNlcnMuanNvbicpO1xuICAgICAgICB9XG4gICAgICAgIHVzZXJNYW5hZ2VySW5zdGFuY2UgPSBuZXcgVXNlck1hbmFnZXIodXNlckZpbGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVzZXJNYW5hZ2VySW5zdGFuY2U7XG4gICAgfSkoKTtcbiAgfVxuICByZXR1cm4gdXNlck1hbmFnZXJJbml0UHJvbWlzZTtcbn1cbiJdfQ==