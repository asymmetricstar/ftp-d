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
                console.log(`[UserManager] ${this.users.length} kullanıcı yüklendi`);
            }
            else {
                this.data = {
                    users: DEFAULT_USERS,
                    lastUpdated: new Date().toISOString(),
                };
                this.save();
                console.log(`[UserManager] Varsayılan ${this.users.length} kullanıcı oluşturuldu`);
            }
        }
        catch (error) {
            console.error('[UserManager] Yükleme hatası:', error);
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
            console.log(`[UserManager] Veriler kaydedildi: ${this.userFile}`);
        }
        catch (error) {
            console.error('[UserManager] Kaydetme hatası:', error);
        }
    }
    findUser(username) {
        if (!username || username.trim() === '') {
            console.error('[UserManager] Boş kullanıcı adı');
            return null;
        }
        const user = this.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.isActive);
        if (!user) {
            console.error('[UserManager] Kullanıcı bulunamadı: ' + username);
        }
        if (!user) {
            console.log(`[UserManager] Kullanıcı bulunamadı: ${username}`);
        }
        return user;
    }
    addUser(username, password, homeDir, permissions) {
        if (!username || !password) {
            console.error('[UserManager] Boş kullanıcı adı veya şifre');
            return false;
        }
        const existing = this.findUser(username);
        if (existing) {
            console.log(`[UserManager] Kullanıcı zaten var: ${username}`);
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
        console.log(`[UserManager] Kullanıcı eklendi: ${username}`);
        return true;
    }
    deleteUser(username) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] Kullanıcı bulunamadı: ${username}`);
            return false;
        }
        this.users = this.users.filter((u) => u.username !== username);
        this.save();
        console.log(`[UserManager] Kullanıcı silindi: ${username}`);
        return true;
    }
    toggleUserStatus(username, isActive) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] Kullanıcı bulunamadı: ${username}`);
            return false;
        }
        user.isActive = isActive;
        this.save();
        console.log(`[UserManager] Kullanıcı durumu değiştirildi: ${username} (${isActive ? 'aktif' : 'pasif'})`);
        return true;
    }
    updatePermissions(username, permissions) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] Kullanıcı bulunamadı: ${username}`);
            return false;
        }
        const currentPermissions = user.permissions || {};
        const newPermissions = {
            ...currentPermissions,
            ...permissions,
        };
        user.permissions = newPermissions;
        this.save();
        console.log(`[UserManager] İzinler güncellendi: ${username}`);
        return true;
    }
    checkPermission(username, permission) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] İzin kontrolü başarısız - kullanıcı bulunamadı: ${username}`);
            return false;
        }
        const hasPermission = user.permissions?.[permission] === true;
        if (!hasPermission) {
            console.log(`[UserManager] İzin reddedildi: ${username} - ${permission}`);
        }
        else {
            console.log(`[UserManager] İzin onaylandı: ${username} - ${permission}`);
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
            console.log(`[UserManager] Kullanıcı bulunamadı: ${oldUsername}`);
            return false;
        }
        const existing = this.findUser(newUsername);
        if (existing) {
            console.log(`[UserManager] Kullanıcı adı zaten var: ${newUsername}`);
            return false;
        }
        user.username = newUsername;
        this.save();
        console.log(`[UserManager] Kullanıcı adı değiştirildi: ${oldUsername} -> ${newUsername}`);
        return true;
    }
    changePassword(username, newPassword) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] Kullanıcı bulunamadı: ${username}`);
            return false;
        }
        user.password = newPassword;
        this.save();
        console.log(`[UserManager] Şifre değiştirildi: ${username}`);
        return true;
    }
    changeHomeDir(username, newHomeDir) {
        const user = this.findUser(username);
        if (!user) {
            console.log(`[UserManager] Kullanıcı bulunamadı: ${username}`);
            return false;
        }
        user.homeDir = path.resolve(newHomeDir);
        this.save();
        console.log(`[UserManager] Dizin değiştirildi: ${username} -> ${user.homeDir}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlck1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXNlck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLElBQUksaUNBQWE7QUFNN0IsTUFBTSxhQUFhLEdBQVc7SUFDNUI7UUFDRSxRQUFRLEVBQUUsT0FBTztRQUNqQixRQUFRLEVBQUUsVUFBVTtRQUNwQixPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUM7UUFDL0MsV0FBVyxFQUFFO1lBQ1gsSUFBSSxFQUFFLElBQUk7WUFDVixLQUFLLEVBQUUsSUFBSTtZQUNYLElBQUksRUFBRSxJQUFJO1lBQ1YsTUFBTSxFQUFFLElBQUk7WUFDWixNQUFNLEVBQUUsSUFBSTtZQUNaLE1BQU0sRUFBRSxJQUFJO1lBQ1osS0FBSyxFQUFFLElBQUk7WUFDWCxHQUFHLEVBQUUsSUFBSTtZQUNULEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTSxFQUFFLElBQUk7WUFDWixhQUFhLEVBQUUsSUFBSTtTQUNwQjtRQUNELFFBQVEsRUFBRSxJQUFJO0tBQ2Y7SUFDRDtRQUNFLFFBQVEsRUFBRSxPQUFPO1FBQ2pCLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQztRQUMvQyxXQUFXLEVBQUU7WUFDWCxJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixNQUFNLEVBQUUsS0FBSztZQUNiLE1BQU0sRUFBRSxLQUFLO1lBQ2IsTUFBTSxFQUFFLEtBQUs7WUFDYixLQUFLLEVBQUUsS0FBSztZQUNaLEdBQUcsRUFBRSxLQUFLO1lBQ1YsS0FBSyxFQUFFLEtBQUs7WUFDWixNQUFNLEVBQUUs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Q0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUMsU0FBUyxDQUFDO0lBQy9CLENBQUM7Q0FHRjs7QUFEZ0IscUJBQVMsR0FBdUIsSUFBSSxBQUEzQixDQUE0QjtBQUl0RCxJQUFJLG1CQUFtQixHQUF1QixJQUFJLENBQUM7QUFDbkQsSUFBSSxzQkFBc0IsR0FBZ0MsSUFBSSxDQUFDO0FBRXhELEtBQUsseUJBQXlCLFFBQWlCO0lBQ3BELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzVCLHNCQUFzQixHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDbkMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDZCxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQ25ELENBQUM7Z0JBQ0QsbUJBQW1CLEdBQUcsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUNELE9BQU8sbUJBQW1CLENBQUM7UUFDN0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNQLENBQUM7SUFDRCxPQUFPLHNCQUFzQixDQUFDO0FBQ2hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFVzZXIsIFVzZXJQZXJtaXNzaW9ucywgVXNlck1hbmFnZXJEYXRhLCBQZXJtaXNzaW9uIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG4vKipcclxuICogRGVmYXVsdCBrdWxsYW7EsWPEsWxhclxyXG4gKi9cclxuY29uc3QgREVGQVVMVF9VU0VSUzogVXNlcltdID0gW1xyXG4gIHtcclxuICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxyXG4gICAgcGFzc3dvcmQ6ICdhZG1pbjEyMycsXHJcbiAgICBob21lRGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZmlsZXMvYWRtaW4nKSxcclxuICAgIHBlcm1pc3Npb25zOiB7XHJcbiAgICAgIHJlYWQ6IHRydWUsXHJcbiAgICAgIHdyaXRlOiB0cnVlLFxyXG4gICAgICBsaXN0OiB0cnVlLFxyXG4gICAgICBjcmVhdGU6IHRydWUsXHJcbiAgICAgIGFwcGVuZDogdHJ1ZSxcclxuICAgICAgZGVsZXRlOiB0cnVlLFxyXG4gICAgICBjaG1vZDogdHJ1ZSxcclxuICAgICAgbWtkOiB0cnVlLFxyXG4gICAgICBybWRpcjogdHJ1ZSxcclxuICAgICAgcmVuYW1lOiB0cnVlLFxyXG4gICAgICBkZWxldGVteWZpbGVzOiB0cnVlLFxyXG4gICAgfSxcclxuICAgIGlzQWN0aXZlOiB0cnVlLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgdXNlcm5hbWU6ICdndWVzdCcsXHJcbiAgICBwYXNzd29yZDogJ2d1ZXN0MTIzJyxcclxuICAgIGhvbWVEaXI6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9maWxlcy9ndWVzdCcpLFxyXG4gICAgcGVybWlzc2lvbnM6IHtcclxuICAgICAgcmVhZDogdHJ1ZSxcclxuICAgICAgd3JpdGU6IGZhbHNlLFxyXG4gICAgICBsaXN0OiB0cnVlLFxyXG4gICAgICBjcmVhdGU6IGZhbHNlLFxyXG4gICAgICBhcHBlbmQ6IGZhbHNlLFxyXG4gICAgICBkZWxldGU6IGZhbHNlLFxyXG4gICAgICBjaG1vZDogZmFsc2UsXHJcbiAgICAgIG1rZDogZmFsc2UsXHJcbiAgICAgIHJtZGlyOiBmYWxzZSxcclxuICAgICAgcmVuYW1lOiBmYWxzZSxcclxuICAgICAgZGVsZXRlbXlmaWxlczogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgaXNBY3RpdmU6IHRydWUsXHJcbiAgfSxcclxuXTtcclxuXHJcbi8qKlxyXG4gKiBVc2VyTWFuYWdlciBjbGFzcyAtIEt1bGxhbsSxY8SxIHnDtm5ldGltaVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFVzZXJNYW5hZ2VyIHtcclxuICBwcml2YXRlIHVzZXJGaWxlOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSB1c2VyczogVXNlcltdID0gW107XHJcbiAgcHJpdmF0ZSBkYXRhOiBVc2VyTWFuYWdlckRhdGE7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHVzZXJGaWxlOiBzdHJpbmcpIHtcclxuICAgIHRoaXMudXNlckZpbGUgPSB1c2VyRmlsZTtcclxuICAgIHRoaXMubG9hZCgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogS3VsbGFuxLFjxLEgdmVyaWxlcmluaSB5w7xrbGVcclxuICAgKi9cclxuICBwcml2YXRlIGxvYWQoKTogdm9pZCB7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0aGlzLnVzZXJGaWxlKSkge1xyXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmModGhpcy51c2VyRmlsZSwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgdGhpcy5kYXRhID0gSlNPTi5wYXJzZShjb250ZW50KTtcclxuICAgICAgICB0aGlzLnVzZXJzID0gdGhpcy5kYXRhLnVzZXJzIHx8IFtdO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdICR7dGhpcy51c2Vycy5sZW5ndGh9IGt1bGxhbsSxY8SxIHnDvGtsZW5kaWApO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIFZhcnNhecSxbGFuIGt1bGxhbsSxY8SxbGFyxLEgb2x1xZ90dXJcclxuICAgICAgICB0aGlzLmRhdGEgPSB7XHJcbiAgICAgICAgICB1c2VyczogREVGQVVMVF9VU0VSUyxcclxuICAgICAgICAgIGxhc3RVcGRhdGVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLnNhdmUoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBWYXJzYXnEsWxhbiAke3RoaXMudXNlcnMubGVuZ3RofSBrdWxsYW7EsWPEsSBvbHXFn3R1cnVsZHVgKTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1VzZXJNYW5hZ2VyXSBZw7xrbGVtZSBoYXRhc8SxOicsIGVycm9yKTtcclxuICAgICAgdGhpcy51c2VycyA9IERFRkFVTFRfVVNFUlM7XHJcbiAgICAgIHRoaXMuZGF0YSA9IHtcclxuICAgICAgICB1c2VyczogREVGQVVMVF9VU0VSUyxcclxuICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogS3VsbGFuxLFjxLEgdmVyaWxlcmluaSBrYXlkZXRcclxuICAgKi9cclxuICBwcml2YXRlIHNhdmUoKTogdm9pZCB7XHJcbiAgICB0cnkge1xyXG4gICAgICB0aGlzLmRhdGEubGFzdFVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModGhpcy51c2VyRmlsZSwgSlNPTi5zdHJpbmdpZnkodGhpcy5kYXRhLCBudWxsLCAyKSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIFZlcmlsZXIga2F5ZGVkaWxkaTogJHt0aGlzLnVzZXJGaWxlfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1VzZXJNYW5hZ2VyXSBLYXlkZXRtZSBoYXRhc8SxOicsIGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEt1bGxhbsSxY8SxIGJ1bFxyXG4gICAqL1xyXG4gIHB1YmxpYyBmaW5kVXNlcih1c2VybmFtZTogc3RyaW5nKTogVXNlciB8IG51bGwge1xyXG4gICAgaWYgKCF1c2VybmFtZSB8fCB1c2VybmFtZS50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tVc2VyTWFuYWdlcl0gQm/FnyBrdWxsYW7EsWPEsSBhZMSxJyk7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVzZXIgPSB0aGlzLnVzZXJzLmZpbmQoXHJcbiAgICAgICh1KSA9PiB1LnVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgPT09IHVzZXJuYW1lLnRvTG93ZXJDYXNlKCkgJiYgdS5pc0FjdGl2ZVxyXG4gICAgKSBhcyBVc2VyIHwgbnVsbDtcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbVXNlck1hbmFnZXJdIEt1bGxhbsSxY8SxIGJ1bHVuYW1hZMSxOiAnICsgdXNlcm5hbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBLdWxsYW7EsWPEsSBidWx1bmFtYWTEsTogJHt1c2VybmFtZX1gKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdXNlcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEt1bGxhbsSxY8SxIGVrbGVcclxuICAgKi9cclxuICBwdWJsaWMgYWRkVXNlcih1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nLCBob21lRGlyOiBzdHJpbmcsIHBlcm1pc3Npb25zOiBVc2VyUGVybWlzc2lvbnMpOiBib29sZWFuIHtcclxuICAgIGlmICghdXNlcm5hbWUgfHwgIXBhc3N3b3JkKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tVc2VyTWFuYWdlcl0gQm/FnyBrdWxsYW7EsWPEsSBhZMSxIHZleWEgxZ9pZnJlJyk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBLdWxsYW7EsWPEsSBhZMSxIHphdGVuIHZhcnNhIGtvbnRyb2wgZXRcclxuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XHJcbiAgICBpZiAoZXhpc3RpbmcpIHtcclxuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gS3VsbGFuxLFjxLEgemF0ZW4gdmFyOiAke3VzZXJuYW1lfWApO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbmV3VXNlcjogVXNlciA9IHtcclxuICAgICAgdXNlcm5hbWUsXHJcbiAgICAgIHBhc3N3b3JkLFxyXG4gICAgICBob21lRGlyOiBwYXRoLnJlc29sdmUoaG9tZURpciksXHJcbiAgICAgIHBlcm1pc3Npb25zOiB7IC4uLnBlcm1pc3Npb25zIH0sXHJcbiAgICAgIGlzQWN0aXZlOiB0cnVlLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnVzZXJzLnB1c2gobmV3VXNlcik7XHJcbiAgICB0aGlzLnNhdmUoKTtcclxuICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIEt1bGxhbsSxY8SxIGVrbGVuZGk6ICR7dXNlcm5hbWV9YCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEt1bGxhbsSxY8SxIHNpbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBkZWxldGVVc2VyKHVzZXJuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lKTtcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBLdWxsYW7EsWPEsSBidWx1bmFtYWTEsTogJHt1c2VybmFtZX1gKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudXNlcnMgPSB0aGlzLnVzZXJzLmZpbHRlcigodSkgPT4gdS51c2VybmFtZSAhPT0gdXNlcm5hbWUpO1xyXG4gICAgdGhpcy5zYXZlKCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBLdWxsYW7EsWPEsSBzaWxpbmRpOiAke3VzZXJuYW1lfWApO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBLdWxsYW7EsWPEsSBha3RpZi9wYXNpZiB5YXBcclxuICAgKi9cclxuICBwdWJsaWMgdG9nZ2xlVXNlclN0YXR1cyh1c2VybmFtZTogc3RyaW5nLCBpc0FjdGl2ZTogYm9vbGVhbik6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIEt1bGxhbsSxY8SxIGJ1bHVuYW1hZMSxOiAke3VzZXJuYW1lfWApO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdXNlci5pc0FjdGl2ZSA9IGlzQWN0aXZlO1xyXG4gICAgdGhpcy5zYXZlKCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBLdWxsYW7EsWPEsSBkdXJ1bXUgZGXEn2nFn3RpcmlsZGk6ICR7dXNlcm5hbWV9ICgke2lzQWN0aXZlID8gJ2FrdGlmJyA6ICdwYXNpZid9KWApO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBLdWxsYW7EsWPEsSBpemlubGVyaW5pIGfDvG5jZWxsZVxyXG4gICAqL1xyXG4gIHB1YmxpYyB1cGRhdGVQZXJtaXNzaW9ucyh1c2VybmFtZTogc3RyaW5nLCBwZXJtaXNzaW9uczogVXNlclBlcm1pc3Npb25zKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCB1c2VyID0gdGhpcy5maW5kVXNlcih1c2VybmFtZSk7XHJcbiAgICBpZiAoIXVzZXIpIHtcclxuICAgICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gS3VsbGFuxLFjxLEgYnVsdW5hbWFkxLE6ICR7dXNlcm5hbWV9YCk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBNZXZjdXQgaXppbmxlcmkga29weWFsYVxyXG4gICAgY29uc3QgY3VycmVudFBlcm1pc3Npb25zID0gdXNlci5wZXJtaXNzaW9ucyB8fCB7fTtcclxuICAgIFxyXG4gICAgLy8gWWVuaSBpemlubGVyaSBiaXJsZcWfdGlyICh5ZW5pIGl6aW4gdmFyc2EgZ8O8bmNlbGxlLCB5b2tzYSBtZXZjdXQga29ydSlcclxuICAgIGNvbnN0IG5ld1Blcm1pc3Npb25zID0ge1xyXG4gICAgICAuLi5jdXJyZW50UGVybWlzc2lvbnMsXHJcbiAgICAgIC4uLnBlcm1pc3Npb25zLFxyXG4gICAgfSBhcyBVc2VyUGVybWlzc2lvbnM7XHJcblxyXG4gICAgdXNlci5wZXJtaXNzaW9ucyA9IG5ld1Blcm1pc3Npb25zO1xyXG4gICAgdGhpcy5zYXZlKCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSDEsHppbmxlciBnw7xuY2VsbGVuZGk6ICR7dXNlcm5hbWV9YCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEt1bGxhbsSxY8SxIGl6aW5sZXJpbmkga29udHJvbCBldFxyXG4gICAqL1xyXG4gIHB1YmxpYyBjaGVja1Blcm1pc3Npb24odXNlcm5hbWU6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIMSwemluIGtvbnRyb2zDvCBiYcWfYXLEsXPEsXogLSBrdWxsYW7EsWPEsSBidWx1bmFtYWTEsTogJHt1c2VybmFtZX1gKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGhhc1Blcm1pc3Npb24gPSB1c2VyLnBlcm1pc3Npb25zPy5bcGVybWlzc2lvbl0gPT09IHRydWU7XHJcbiAgICBcclxuICAgIGlmICghaGFzUGVybWlzc2lvbikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSDEsHppbiByZWRkZWRpbGRpOiAke3VzZXJuYW1lfSAtICR7cGVybWlzc2lvbn1gKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIMSwemluIG9uYXlsYW5kxLE6ICR7dXNlcm5hbWV9IC0gJHtwZXJtaXNzaW9ufWApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBoYXNQZXJtaXNzaW9uO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVMO8bSBrdWxsYW7EsWPEsWxhcsSxIGxpc3RlbGVcclxuICAgKi9cclxuICBwdWJsaWMgbGlzdFVzZXJzKCk6IFVzZXJbXSB7XHJcbiAgICByZXR1cm4gdGhpcy51c2Vycy5maWx0ZXIoKHUpID0+IHUuaXNBY3RpdmUpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogS3VsbGFuxLFjxLEgaXN0YXRpc3Rpa2xlcmlcclxuICAgKi9cclxuICBwdWJsaWMgZ2V0VXNlclN0YXRzKCk6IE1hcDxzdHJpbmcsIG51bWJlcj4ge1xyXG4gICAgY29uc3Qgc3RhdHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgdGhpcy51c2Vycy5mb3JFYWNoKCh1c2VyKSA9PiB7XHJcbiAgICAgIHN0YXRzLnNldCh1c2VyLnVzZXJuYW1lLCBPYmplY3Qua2V5cyh1c2VyLnBlcm1pc3Npb25zIHx8IHt9KS5sZW5ndGgpO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gc3RhdHM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBLdWxsYW7EsWPEsSBzYXnEsXPEsW7EsSBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRVc2VyQ291bnQoKTogbnVtYmVyIHtcclxuICAgIHJldHVybiB0aGlzLnVzZXJzLmZpbHRlcigodSkgPT4gdS5pc0FjdGl2ZSkubGVuZ3RoO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogS3VsbGFuxLFjxLEgYWTEsW7EsSBkZcSfacWfdGlyXHJcbiAgICovXHJcbiAgcHVibGljIGNoYW5nZVVzZXJuYW1lKG9sZFVzZXJuYW1lOiBzdHJpbmcsIG5ld1VzZXJuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKG9sZFVzZXJuYW1lKTtcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBLdWxsYW7EsWPEsSBidWx1bmFtYWTEsTogJHtvbGRVc2VybmFtZX1gKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFllbmkga3VsbGFuxLFjxLEgYWTEsSB6YXRlbiB2YXJzYSBrb250cm9sIGV0XHJcbiAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZmluZFVzZXIobmV3VXNlcm5hbWUpO1xyXG4gICAgaWYgKGV4aXN0aW5nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIEt1bGxhbsSxY8SxIGFkxLEgemF0ZW4gdmFyOiAke25ld1VzZXJuYW1lfWApO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdXNlci51c2VybmFtZSA9IG5ld1VzZXJuYW1lO1xyXG4gICAgdGhpcy5zYXZlKCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBLdWxsYW7EsWPEsSBhZMSxIGRlxJ9pxZ90aXJpbGRpOiAke29sZFVzZXJuYW1lfSAtPiAke25ld1VzZXJuYW1lfWApO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBLdWxsYW7EsWPEsSDFn2lmcmVzaW5pIGRlxJ9pxZ90aXJcclxuICAgKi9cclxuICBwdWJsaWMgY2hhbmdlUGFzc3dvcmQodXNlcm5hbWU6IHN0cmluZywgbmV3UGFzc3dvcmQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdXNlciA9IHRoaXMuZmluZFVzZXIodXNlcm5hbWUpO1xyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVXNlck1hbmFnZXJdIEt1bGxhbsSxY8SxIGJ1bHVuYW1hZMSxOiAke3VzZXJuYW1lfWApO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdXNlci5wYXNzd29yZCA9IG5ld1Bhc3N3b3JkO1xyXG4gICAgdGhpcy5zYXZlKCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSDFnmlmcmUgZGXEn2nFn3RpcmlsZGk6ICR7dXNlcm5hbWV9YCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEt1bGxhbsSxY8SxIGRpemluaW5pIGRlxJ9pxZ90aXJcclxuICAgKi9cclxuICBwdWJsaWMgY2hhbmdlSG9tZURpcih1c2VybmFtZTogc3RyaW5nLCBuZXdIb21lRGlyOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHVzZXIgPSB0aGlzLmZpbmRVc2VyKHVzZXJuYW1lKTtcclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW1VzZXJNYW5hZ2VyXSBLdWxsYW7EsWPEsSBidWx1bmFtYWTEsTogJHt1c2VybmFtZX1gKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHVzZXIuaG9tZURpciA9IHBhdGgucmVzb2x2ZShuZXdIb21lRGlyKTtcclxuICAgIHRoaXMuc2F2ZSgpO1xyXG4gICAgY29uc29sZS5sb2coYFtVc2VyTWFuYWdlcl0gRGl6aW4gZGXEn2nFn3RpcmlsZGk6ICR7dXNlcm5hbWV9IC0+ICR7dXNlci5ob21lRGlyfWApO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVc2VyTWFuYWdlciDDtnJuZcSfaSBvbHXFn3R1ciAoc2luZ2xldG9uKVxyXG4gICAqL1xyXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UodXNlckZpbGU6IHN0cmluZyk6IFVzZXJNYW5hZ2VyIHtcclxuICAgIGlmICghVXNlck1hbmFnZXIuX2luc3RhbmNlKSB7XHJcbiAgICAgIFVzZXJNYW5hZ2VyLl9pbnN0YW5jZSA9IG5ldyBVc2VyTWFuYWdlcih1c2VyRmlsZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gVXNlck1hbmFnZXIuX2luc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzdGF0aWMgX2luc3RhbmNlOiBVc2VyTWFuYWdlciB8IG51bGwgPSBudWxsO1xyXG59XHJcblxyXG4vLyBTaW5nbGV0b24gaW5zdGFuY2Ugb2x1xZ90dXJtYSAtIGTDtm5nw7wgYmHEn8SxbWzEsWzEscSfxLFuZGFuIGthw6fEsW5tYWsgacOnaW5cclxubGV0IHVzZXJNYW5hZ2VySW5zdGFuY2U6IFVzZXJNYW5hZ2VyIHwgbnVsbCA9IG51bGw7XHJcbmxldCB1c2VyTWFuYWdlckluaXRQcm9taXNlOiBQcm9taXNlPFVzZXJNYW5hZ2VyPiB8IG51bGwgPSBudWxsO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJNYW5hZ2VyKHVzZXJGaWxlPzogc3RyaW5nKTogUHJvbWlzZTxVc2VyTWFuYWdlcj4ge1xyXG4gIGlmICghdXNlck1hbmFnZXJJbml0UHJvbWlzZSkge1xyXG4gICAgdXNlck1hbmFnZXJJbml0UHJvbWlzZSA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGlmICghdXNlck1hbmFnZXJJbnN0YW5jZSkge1xyXG4gICAgICAgIGlmICghdXNlckZpbGUpIHtcclxuICAgICAgICAgIHVzZXJGaWxlID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL3VzZXJzLmpzb24nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdXNlck1hbmFnZXJJbnN0YW5jZSA9IG5ldyBVc2VyTWFuYWdlcih1c2VyRmlsZSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHVzZXJNYW5hZ2VySW5zdGFuY2U7XHJcbiAgICB9KSgpO1xyXG4gIH1cclxuICByZXR1cm4gdXNlck1hbmFnZXJJbml0UHJvbWlzZTtcclxufVxyXG4iXX0=