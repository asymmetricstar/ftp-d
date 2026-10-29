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
        password: 'admin123',
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
    },
    {
        username: 'guest',
        password: 'guest123',
        homeDir: path.join(__dirname, '../files/guest'),
        permissions: {
            read: true,
            write: false,
            list: true,
            create: false,
            append: false,
            delete: false,
            chmod: false,
            mkd: false,
            rmdir: false,
            rename: false,
            deletemyfiles: false,
        },
        isActive: true,
    },
];
class UserManager {
    constructor(userFile) {
        this.users = [];
        this.userFile = userFile;
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.userFile)) {
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
        try {
            this.data.lastUpdated = new Date().toISOString();
            fs.writeFileSync(this.userFile, JSON.stringify(this.data, null, 2));
            console.log(`[UserManager] Save error:`);
        }
        catch (error) {
            console.error(`[UserManager] Empty username`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlck1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXNlck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLElBQUksaUNBQWE7QUFNN0IsTUFBTSxhQUFhLEdBQVc7SUFDNUI7UUFDRSxRQUFRLEVBQUUsT0FBTztRQUNqQixRQUFRLEVBQUUsVUFBVTtRQUNwQixPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUM7UUFDL0MsV0FBVyxFQUFFO1lBQ1gsSUFBSSxFQUFFLElBQUk7WUFDVixLQUFLLEVBQUUsSUFBSTtZQUNYLElBQUksRUFBRSxJQUFJO1lBQ1YsTUFBTSxFQUFFLElBQUk7WUFDWixNQUFNLEVBQUUsSUFBSTtZQUNaLE1BQU0sRUFBRSxJQUFJO1lBQ1osS0FBSyxFQUFFLElBQUk7WUFDWCxHQUFHLEVBQUUsSUFBSTtZQUNULEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTSxFQUFFLElBQUk7WUFDWixhQUFhLEVBQUUsSUFBSTtTQUNwQjtRQUNELFFBQVEsRUFBRSxJQUFJO0tBQ2Y7SUFDRDtRQUNFLFFBQVEsRUFBRSxPQUFPO1FBQ2pCLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQztRQUMvQyxXQUFXLEVBQUU7WUFDWCxJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixNQUFNLEVBQUUsS0FBSztZQUNiLE1BQU0sRUFBRSxLQUFLO1lBQ2IsTUFBTSxFQUFFLEtBQUs7WUFDYixLQUFLLEVBQUUsS0FBSztZQUNaLEdBQUcsRUFBRSxLQUFLO1lBQ1YsS0FBSyxFQUFFLEtBQUs7WUFDWixNQUFNLEVBQUUsS0FBSztZQUNiLGFBQWEsRUFBRSxLQUFLO1NBQ3JCO1FBQ0QsUUFBUSxFQUFFLElBQUk7S0FDZjtDQUNGLENBQUM7QUFLRjtJQUtFLFlBQVksUUFBZ0I7UUFIcEIsVUFBSyxHQUFXLEVBQUUsQ0FBQztRQUl6QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDZCxDQUFDO0lBS08sSUFBSTtRQUNWLElBQUksQ0FBQztZQUNILElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN4RCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sZUFBZSxDQUFDLENBQUM7WUFDakUsQ0FBQztpQkFBTSxDQUFDO2dCQUVOLElBQUksQ0FBQyxJQUFJLEdBQUc7b0JBQ1YsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLFdBQVcsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtpQkFDdEMsQ0FBQztnQkFDRixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLGdCQUFnQixDQUFDLENBQUM7WUFDMUUsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUc7Z0JBQ1YsS0FBSyxFQUFFLGFBQWE7Z0JBQ3BCLFdBQVcsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTthQUN0QyxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFLTyxJQUFJO1FBQ1YsSUFBSSxDQUFDO1lBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqRCxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUNoRCxDQUFDO0lBQ0gsQ0FBQztJQUtNLFFBQVEsQ0FBQyxRQUFnQjtRQUM5QixJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUN4QyxPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUMxQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FDMUQsQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUtNLE9BQU8sQ0FBQyxRQUFnQixFQUFFLFFBQWdCLEVBQUUsT0FBZSxFQUFFLFdBQTRCO1FBQzlGLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUdELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDckQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQVM7WUFDcEIsUUFBUTtZQUNSLFFBQVE7WUFDUixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDOUIsV0FBVyxFQUFFLEVBQUUsR0FBRyxXQUFXLEVBQUU7WUFDL0IsUUFBUSxFQUFFLElBQUk7U0FDZixDQUFDO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN6RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFLTSxVQUFVLENBQUMsUUFBZ0I7UUFDaEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN6RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFLTSxnQkFBZ0IsQ0FBQyxRQUFnQixFQUFFLFFBQWlCO1FBQ3pELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ25HLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDekQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBS00saUJBQWlCLENBQUMsUUFBZ0IsRUFBRSxXQUE0QjtRQUNyRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDOUQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBR0QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztRQUdsRCxNQUFNLGNBQWMsR0FBRztZQUNyQixHQUFHLGtCQUFrQjtZQUNyQixHQUFHLFdBQVc7U0FDSSxDQUFDO1FBRXJCLElBQUksQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkRBQTJELFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDbkYsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBS00sZUFBZSxDQUFDLFFBQWdCLEVBQUUsVUFBc0I7UUFDN0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLENBQUM7UUFFOUQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLFFBQVEsTUFBTSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsUUFBUSxNQUFNLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDL0UsQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3ZCLENBQUM7SUFLTSxTQUFTO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFLTSxZQUFZO1FBQ2pCLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDMUIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUtNLFlBQVk7UUFDakIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNyRCxDQUFDO0lBS00sY0FBYyxDQUFDLFdBQW1CLEVBQUUsV0FBbUI7UUFDNUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLDBDQUEwQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUdELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQTBDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDckUsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxXQUFXLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsV0FBVyxPQUFPLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDaEYsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBS00sY0FBYyxDQUFDLFFBQWdCLEVBQUUsV0FBbUI7UUFDekQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzNELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDO1FBQzVCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDekQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBS00sYUFBYSxDQUFDLFFBQWdCLEVBQUUsVUFBa0I7UUFDdkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxRQUFRLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDL0UsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBS00sTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFnQjtRQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQztJQUMvQixDQUFDO0NBR0Y7O0FBRGdCLHFCQUFTLEdBQXVCLElBQUksQUFBM0IsQ0FBNEI7QUFJdEQsSUFBSSxtQkFBbUIsR0FBdUIsSUFBSSxDQUFDO0FBQ25ELElBQUksc0JBQXNCLEdBQWdDLElBQUksQ0FBQztBQUV4RCxLQUFLLHlCQUF5QixRQUFpQjtJQUNwRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM1QixzQkFBc0IsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ25DLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2QsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUNuRCxDQUFDO2dCQUNELG1CQUFtQixHQUFHLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELENBQUM7WUFDRCxPQUFPLG1CQUFtQixDQUFDO1FBQzdCLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDUCxDQUFDO0lBQ0QsT0FBTyxzQkFBc0IsQ0FBQztBQUNoQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFVzZXIsIFVzZXJQZXJtaXNzaW9ucywgVXNlck1hbmFnZXJEYXRhLCBQZXJtaXNzaW9uIH0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogRGVmYXVsdCBrdWxsYW7EsWPEsWxhclxuICovXG5jb25zdCBERUZBVUxUX1VTRVJTOiBVc2VyW10gPSBbXG4gIHtcbiAgICB1c2VybmFtZTogJ2FkbWluJyxcbiAgICBwYXNzd29yZDogJ2FkbWluMTIzJyxcbiAgICBob21lRGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZmlsZXMvYWRtaW4nKSxcbiAgICBwZXJtaXNzaW9uczoge1xuICAgICAgcmVhZDogdHJ1ZSxcbiAgICAgIHdyaXRlOiB0cnVlLFxuICAgICAgbGlzdDogdHJ1ZSxcbiAgICAgIGNyZWF0ZTogdHJ1ZSxcbiAgICAgIGFwcGVuZDogdHJ1ZSxcbiAgICAgIGRlbGV0ZTogdHJ1ZSxcbiAgICAgIGNobW9kOiB0cnVlLFxuICAgICAgbWtkOiB0cnVlLFxuICAgICAgcm1kaXI6IHRydWUsXG4gICAgICByZW5hbWU6IHRydWUsXG4gICAgICBkZWxldGVteWZpbGVzOiB0cnVlLFxuICAgIH0sXG4gICAgaXNBY3RpdmU6IHRydWUsXG4gIH0sXG4gIHtcbiAgICB1c2VybmFtZTogJ2d1ZXN0JyxcbiAgICBwYXNzd29yZDogJ2d1ZXN0MTIzJyxcbiAgICBob21lRGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZmlsZXMvZ3Vlc3QnKSxcbiAgICBwZXJtaXNzaW9uczoge1xuICAgICAgcmVhZDogdHJ1ZSxcbiAgICAgIHdyaXRlOiBmYWxzZSxcbiAgICAgIGxpc3Q6IHRydWUsXG4gICAgICBjcmVhdGU6IGZhbHNlLFxuICAgICAgYXBwZW5kOiBmYWxzZSxcbiAgICAgIGRlbGV0ZTogZmFsc2UsXG4gICAgICBjaG1vZDogZmFsc2UsXG4gICAgICBta2Q6IGZhbHNlLFxuICAgICAgcm1kaXI6IGZhbHNlLFxuICAgICAgcmVuYW1lOiBmYWxzZSxcbiAgICAgIGRlbGV0ZW15ZmlsZXM6IGZhbHNlLFxuICAgIH0sXG4gICAgaXNBY3RpdmU6IHRydWUsXG4gIH0sXG5dO1xuXG4vKipcbiAqIFVzZXJNYW5hZ2VyIGNsYXNzIC0gS3VsbGFuxLFjxLEgecO2bmV0aW1pXG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VyTWFuYWdlciB7XG4gIHByaXZhdGUgdXNlckZpbGU6IHN0cmluZztcbiAgcHJpdmF0ZSB1c2VyczogVXNlcltdID0gW107XG4gIHByaXZhdGUgZGF0YTogVXNlck1hbmFnZXJEYXRhO1xuXG4gIGNvbnN0cnVjdG9yKHVzZXJGaWxlOiBzdHJpbmcpIHtcbiAgICB0aGlzLnVzZXJGaWxlID0gdXNlckZpbGU7XG4gICAgdGhpcy5sb2FkKCk7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgdmVyaWxlcmluaSB5w7xrbGVcbiAgICovXG4gIHByaXZhdGUgbG9hZCgpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGhpcy51c2VyRmlsZSkpIHtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyh0aGlzLnVzZXJGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgdGhpcy5kYXRhID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgdGhpcy51c2VycyA9IHRoaXMuZGF0YS51c2VycyB8fCBbXTtcbiAgICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gJHt0aGlzLnVzZXJzLmxlbmd0aH0gdXNlcnMgbG9hZGVkYCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBWYXJzYXnEsWxhbiBrdWxsYW7EsWPEsWxhcsSxIG9sdcWfdHVyXG4gICAgICAgIHRoaXMuZGF0YSA9IHtcbiAgICAgICAgICB1c2VyczogREVGQVVMVF9VU0VSUyxcbiAgICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gRGVmYXVsdCAke3RoaXMudXNlcnMubGVuZ3RofSB1c2VycyBjcmVhdGVkYCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtVc2VyTWFuYWdlcl0gTG9hZCBlcnJvcjpgKTtcbiAgICAgIHRoaXMudXNlcnMgPSBERUZBVUxUX1VTRVJTO1xuICAgICAgdGhpcy5kYXRhID0ge1xuICAgICAgICB1c2VyczogREVGQVVMVF9VU0VSUyxcbiAgICAgICAgbGFzdFVwZGF0ZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIHZlcmlsZXJpbmkga2F5ZGV0XG4gICAqL1xuICBwcml2YXRlIHNhdmUoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuZGF0YS5sYXN0VXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModGhpcy51c2VyRmlsZSwgSlNPTi5zdHJpbmdpZnkodGhpcy5kYXRhLCBudWxsLCAyKSk7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBTYXZlIGVycm9yOmApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIEVtcHR5IHVzZXJuYW1lYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGJ1bFxuICAgKi9cbiAgcHVibGljIGZpbmRVc2VyKHVzZXJuYW1lOiBzdHJpbmcpOiBVc2VyIHwgbnVsbCB7XG4gICAgaWYgKCF1c2VybmFtZSB8fCB1c2VybmFtZS50cmltKCkgPT09ICcnKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlciA9IHRoaXMudXNlcnMuZmluZChcbiAgICAgICh1KSA9PiB1LnVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgPT09IHVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgJiYgdS5pc0FjdGl2ZVxuICAgICkgYXMgVXNlciB8IG51bGw7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgIH1cblxuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gRW1wdHkgdXNlcm5hbWUgb3IgcGFzc3dvcmRgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdXNlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBla2xlXG4gICAqL1xuICBwdWJsaWMgYWRkVXNlcih1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBob21lRGlyOiBzdHJpbmcsIHBlcm1pc3Npb25zOiBVc2VyUGVybWlzc2lvbnMpOiBib29sZWFuIHtcbiAgICBpZiAoIXVzZXJuYW1lIHx8ICFwYXNzd29yZCkge1xuICAgICAgY29uc29sZS5lcnJvcihgW1VzZXJNYW5hZ2VyXSBVc2VyIGFscmVhZHkgZXhpc3RzOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIEt1bGxhbsSxY8SxIGFkxLEgemF0ZW4gdmFyc2Ega29udHJvbCBldFxuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIGFkZGVkOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld1VzZXI6IFVzZXIgPSB7XG4gICAgICB1c2VybmFtZSxcbiAgICAgIHBhc3N3b3JkLFxuICAgICAgaG9tZURpcjogcGF0aC5yZXNvbHZlKGhvbWVEaXIpLFxuICAgICAgcGVybWlzc2lvbnM6IHsgLi4ucGVybWlzc2lvbnMgfSxcbiAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgIH07XG5cbiAgICB0aGlzLnVzZXJzLnB1c2gobmV3VXNlcik7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgc2lsXG4gICAqL1xuICBwdWJsaWMgZGVsZXRlVXNlcih1c2VybmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBkZWxldGVkOiAke3VzZXJuYW1lfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMudXNlcnMgPSB0aGlzLnVzZXJzLmZpbHRlcigodSkgPT4gdS51c2VybmFtZSAhPT0gdXNlcm5hbWUpO1xuICAgIHRoaXMuc2F2ZSgpO1xuICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFVzZXIgbm90IGZvdW5kOiAke3VzZXJuYW1lfWApO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGFrdGlmL3Bhc2lmIHlhcFxuICAgKi9cbiAgcHVibGljIHRvZ2dsZVVzZXJTdGF0dXModXNlcm5hbWU6IHN0cmluZywgaXNBY3RpdmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIHN0YXR1cyBjaGFuZ2VkOiAke3VzZXJuYW1lfSAoJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJ3Bhc3NpdmUnfSlgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLmlzQWN0aXZlID0gaXNBY3RpdmU7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgaXppbmxlcmluaSBnw7xuY2VsbGVcbiAgICovXG4gIHB1YmxpYyB1cGRhdGVQZXJtaXNzaW9ucyh1c2VybmFtZTogc3RyaW5nLCBwZXJtaXNzaW9uczogVXNlclBlcm1pc3Npb25zKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gUGVybWlzc2lvbnMgdXBkYXRlZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBNZXZjdXQgaXppbmxlcmkga29weWFsYVxuICAgIGNvbnN0IGN1cnJlbnRQZXJtaXNzaW9ucyA9IHVzZXIucGVybWlzc2lvbnMgfHwge307XG4gICAgXG4gICAgLy8gWWVuaSBpemlubGVyaSBiaXJsZcWfdGlyICh5ZW5pIGl6aW4gdmFyc2EgZ8O8bmNlbGxlLCB5b2tzYSBtZXZjdXQga29ydSlcbiAgICBjb25zdCBuZXdQZXJtaXNzaW9ucyA9IHtcbiAgICAgIC4uLmN1cnJlbnRQZXJtaXNzaW9ucyxcbiAgICAgIC4uLnBlcm1pc3Npb25zLFxuICAgIH0gYXMgVXNlclBlcm1pc3Npb25zO1xuXG4gICAgdXNlci5wZXJtaXNzaW9ucyA9IG5ld1Blcm1pc3Npb25zO1xuICAgIHRoaXMuc2F2ZSgpO1xuICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFBlcm1pc3Npb24gY2hlY2sgZmFpbGVkIC0gdXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgaXppbmxlcmluaSBrb250cm9sIGV0XG4gICAqL1xuICBwdWJsaWMgY2hlY2tQZXJtaXNzaW9uKHVzZXJuYW1lOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VyIG5vdCBmb3VuZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBoYXNQZXJtaXNzaW9uID0gdXNlci5wZXJtaXNzaW9ucz8uW3Blcm1pc3Npb25dID09PSB0cnVlO1xuXG4gICAgaWYgKCFoYXNQZXJtaXNzaW9uKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBQZXJtaXNzaW9uIGRlbmllZDogJHt1c2VybmFtZX0gLSAke3Blcm1pc3Npb259YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFBlcm1pc3Npb24gZ3JhbnRlZDogJHt1c2VybmFtZX0gLSAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhc1Blcm1pc3Npb247XG4gIH1cblxuICAvKipcbiAgICogVMO8bSBrdWxsYW7EsWPEsWxhcsSxIGxpc3RlbGVcbiAgICovXG4gIHB1YmxpYyBsaXN0VXNlcnMoKTogVXNlcltdIHtcbiAgICByZXR1cm4gdGhpcy51c2Vycy5maWx0ZXIoKHUpID0+IHUuaXNBY3RpdmUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGlzdGF0aXN0aWtsZXJpXG4gICAqL1xuICBwdWJsaWMgZ2V0VXNlclN0YXRzKCk6IE1hcDxzdHJpbmcsIG51bWJlcj4ge1xuICAgIGNvbnN0IHN0YXRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICB0aGlzLnVzZXJzLmZvckVhY2goKHVzZXIpID0+IHtcbiAgICAgIHN0YXRzLnNldCh1c2VyLnVzZXJuYW1lLCBPYmplY3Qua2V5cyh1c2VyLnBlcm1pc3Npb25zIHx8IHt9KS5sZW5ndGgpO1xuICAgIH0pO1xuICAgIHJldHVybiBzdGF0cztcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSBzYXnEsXPEsW7EsSBhbFxuICAgKi9cbiAgcHVibGljIGdldFVzZXJDb3VudCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnVzZXJzLmZpbHRlcigodSkgPT4gdS5pc0FjdGl2ZSkubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEt1bGxhbsSxY8SxIGFkxLFuxLEgZGXEn2nFn3RpclxuICAgKi9cbiAgcHVibGljIGNoYW5nZVVzZXJuYW1lKG9sZFVzZXJuYW1lOiBzdHJpbmcsIG5ld1VzZXJuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcihvbGRVc2VybmFtZSk7XG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VybmFtZSBhbHJlYWR5IGV4aXN0czogJHtuZXdVc2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBZZW5pIGt1bGxhbsSxY8SxIGFkxLEgemF0ZW4gdmFyc2Ega29udHJvbCBldFxuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5maW5kVXNlcihuZXdVc2VybmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBVc2VybmFtZSBhbHJlYWR5IGV4aXN0czogJHtuZXdVc2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLnVzZXJuYW1lID0gbmV3VXNlcm5hbWU7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlcm5hbWUgY2hhbmdlZDogJHtvbGRVc2VybmFtZX0gLT4gJHtuZXdVc2VybmFtZX1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLdWxsYW7EsWPEsSDFn2lmcmVzaW5pIGRlxJ9pxZ90aXJcbiAgICovXG4gIHB1YmxpYyBjaGFuZ2VQYXNzd29yZCh1c2VybmFtZTogc3RyaW5nLCBuZXdQYXNzd29yZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gUGFzc3dvcmQgY2hhbmdlZDogJHt1c2VybmFtZX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB1c2VyLnBhc3N3b3JkID0gbmV3UGFzc3dvcmQ7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogS3VsbGFuxLFjxLEgZGl6aW5pbmkgZGXEn2nFn3RpclxuICAgKi9cbiAgcHVibGljIGNoYW5nZUhvbWVEaXIodXNlcm5hbWU6IHN0cmluZywgbmV3SG9tZURpcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xuICAgIGlmICghdXNlcikge1xuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gVXNlciBub3QgZm91bmQ6ICR7dXNlcm5hbWV9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdXNlci5ob21lRGlyID0gcGF0aC5yZXNvbHZlKG5ld0hvbWVEaXIpO1xuICAgIHRoaXMuc2F2ZSgpO1xuICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIERpcmVjdG9yeSBjaGFuZ2VkOiAke3VzZXJuYW1lfSAtPiAke3VzZXIuaG9tZURpcn1gKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VyTWFuYWdlciDDtnJuZcSfaSBvbHXFn3R1ciAoc2luZ2xldG9uKVxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSh1c2VyRmlsZTogc3RyaW5nKTogVXNlck1hbmFnZXIge1xuICAgIGlmICghVXNlck1hbmFnZXIuX2luc3RhbmNlKSB7XG4gICAgICBVc2VyTWFuYWdlci5faW5zdGFuY2UgPSBuZXcgVXNlck1hbmFnZXIodXNlckZpbGUpO1xuICAgIH1cbiAgICByZXR1cm4gVXNlck1hbmFnZXIuX2luc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgX2luc3RhbmNlOiBVc2VyTWFuYWdlciB8IG51bGwgPSBudWxsO1xufVxuXG4vLyBTaW5nbGV0b24gaW5zdGFuY2Ugb2x1xZ90dXJtYSAtIGTDtm5nw7wgYmHEn8SxbWzEsWzEscSfxLFuZGFuIGthw6fEsW5tYWsgacOnaW5cbmxldCB1c2VyTWFuYWdlckluc3RhbmNlOiBVc2VyTWFuYWdlciB8IG51bGwgPSBudWxsO1xubGV0IHVzZXJNYW5hZ2VySW5pdFByb21pc2U6IFByb21pc2U8VXNlck1hbmFnZXI+IHwgbnVsbCA9IG51bGw7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVc2VyTWFuYWdlcih1c2VyRmlsZT86IHN0cmluZyk6IFByb21pc2U8VXNlck1hbmFnZXI+IHtcbiAgaWYgKCF1c2VyTWFuYWdlckluaXRQcm9taXNlKSB7XG4gICAgdXNlck1hbmFnZXJJbml0UHJvbWlzZSA9IChhc3luYyAoKSA9PiB7XG4gICAgICBpZiAoIXVzZXJNYW5hZ2VySW5zdGFuY2UpIHtcbiAgICAgICAgaWYgKCF1c2VyRmlsZSkge1xuICAgICAgICAgIHVzZXJGaWxlID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL3VzZXJzLmpzb24nKTtcbiAgICAgICAgfVxuICAgICAgICB1c2VyTWFuYWdlckluc3RhbmNlID0gbmV3IFVzZXJNYW5hZ2VyKHVzZXJGaWxlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1c2VyTWFuYWdlckluc3RhbmNlO1xuICAgIH0pKCk7XG4gIH1cbiAgcmV0dXJuIHVzZXJNYW5hZ2VySW5pdFByb21pc2U7XG59XG4iXX0=