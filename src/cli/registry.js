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
exports.GROUPS = exports.COMMANDS = void 0;
exports.findCommand = findCommand;
exports.commandNames = commandNames;
exports.handleFtpCommand = handleFtpCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const palette_1 = require("./theme/palette");
const logo_1 = require("./theme/logo");
const help_1 = require("./help");
const ui_1 = require("./ui");
const logger_1 = require("../utils/logger");
exports.COMMANDS = [
    { name: 'help', aliases: ['?'], group: 'Session', usage: 'help [command]', summary: 'Show help' },
    { name: 'clear', group: 'Session', usage: 'clear', summary: 'Clear the screen' },
    { name: 'version', group: 'Session', usage: 'version', summary: 'Show version' },
    { name: 'status', group: 'Session', usage: 'status', summary: 'Show server and session status' },
    { name: 'exit', aliases: ['quit', 'q', ':q'], group: 'Session', usage: 'exit', summary: 'Stop the server and leave the shell' },
    { name: 'start', group: 'Session', usage: 'start', summary: 'Start the FTP server' },
    { name: 'stop', group: 'Session', usage: 'stop', summary: 'Stop the FTP server' },
    { name: 'restart', group: 'Session', usage: 'restart', summary: 'Restart the FTP server' },
    { name: 'ls', aliases: ['dir'], group: 'Files', usage: 'ls [path]', summary: 'List a directory' },
    { name: 'pwd', group: 'Files', usage: 'pwd', summary: 'Print the working directory' },
    { name: 'cd', group: 'Files', usage: 'cd <path>', summary: 'Change directory (inside home)' },
    { name: 'mkdir', group: 'Files', usage: 'mkdir <dir>', summary: 'Create a directory' },
    { name: 'rm', aliases: ['remove'], group: 'Files', usage: 'rm [-r] <path>', summary: 'Remove a file or directory' },
    { name: 'mv', aliases: ['rename'], group: 'Files', usage: 'mv <src> <dst>', summary: 'Rename or move' },
    { name: 'list', aliases: ['users'], group: 'Users', usage: 'list', summary: 'List FTP accounts' },
    {
        name: 'add',
        aliases: ['useradd'],
        group: 'Users',
        usage: 'add --username <name> --password <pass> [--home <dir>] [--perm <rwxr-xr-x>]',
        summary: 'Add an account (prompts when no flags are given)',
    },
    {
        name: 'del',
        aliases: ['userdel'],
        group: 'Users',
        usage: 'del --username <name>',
        summary: 'Delete an account (prompts when --username is omitted)',
    },
    {
        name: 'update',
        group: 'Users',
        usage: 'update --username <name> [--password <pass>] [--home <dir>] [--new-username <name>] [--perm <rwxr-xr-x>] [--enable|--disable]',
        summary: 'Update an account (prompts when no flags are given)',
    },
    { name: 'config', aliases: ['settings'], group: 'Config', usage: 'config [show|get|set|unset|path]', summary: 'Server settings (SQLite)' },
];
exports.GROUPS = [...new Set(exports.COMMANDS.map((command) => command.group))];
function findCommand(name) {
    const needle = name.toLowerCase();
    return (exports.COMMANDS.find((command) => command.name === needle || (command.aliases ?? []).includes(needle)) ?? null);
}
function commandNames() {
    return exports.COMMANDS.flatMap((command) => [command.name, ...(command.aliases ?? [])]);
}
function ok(message) {
    return `${(0, palette_1.green)('✓')} ${message}`;
}
function err(message) {
    return { lines: [`${(0, palette_1.red)('✗')} ${message}`] };
}
function hint(message) {
    return `  ${(0, palette_1.faint)(message)}`;
}
function usage(cmdName) {
    const command = findCommand(cmdName);
    return err(`usage: ${command ? command.usage : cmdName}`);
}
function tokenize(line) {
    const tokens = [];
    let current = '';
    let quote = null;
    let started = false;
    for (const char of line) {
        if (quote !== null) {
            if (char === quote)
                quote = null;
            else
                current += char;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            started = true;
            continue;
        }
        if (char === ' ' || char === '\t') {
            if (started || current !== '') {
                tokens.push(current);
                current = '';
                started = false;
            }
            continue;
        }
        current += char;
        started = true;
    }
    if (quote !== null && current !== '')
        tokens.push(current);
    if (started || current !== '')
        tokens.push(current);
    return tokens;
}
function sessionUser(ctx) {
    return ctx.user;
}
function permissionString(ctx, username) {
    const db = ctx.server.getDb();
    const user = ctx.server.getUserManager()?.findUser(username, true);
    return db.toLinuxString(user?.permissions);
}
function needLogin(ctx) {
    if (sessionUser(ctx))
        return null;
    return {
        lines: [
            `${(0, palette_1.yellow)('!')} no session account`,
            hint(`add one first: add --username <name> --password <pass>`),
        ],
    };
}
function needPermission(ctx, permission) {
    const user = sessionUser(ctx);
    if (!user)
        return needLogin(ctx);
    const userManager = ctx.server.getUserManager();
    if (!userManager)
        return err('user manager not initialized');
    if (userManager.checkPermission(user, permission))
        return null;
    return {
        lines: [
            `${(0, palette_1.red)('✗')} permission denied: ${permission} ${(0, palette_1.faint)(`(${user} ${permissionString(ctx, user)})`)}`,
            hint(`grant it with: update --username ${user} --perm rwxr-xr-x`),
        ],
    };
}
function resolveTarget(ctx, raw, fallback = '.') {
    const base = ctx.currentDir || ctx.homeDir || process.cwd();
    return path.resolve(base, raw && raw.trim() !== '' ? raw : fallback);
}
function insideHome(ctx, target) {
    const home = path.resolve(ctx.homeDir || process.cwd());
    const rel = path.relative(home, target);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes}`;
    const units = ['K', 'M', 'G', 'T'];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(1)}${units[index]}`;
}
function relativeTo(ctx, target) {
    const base = path.resolve(ctx.currentDir || ctx.homeDir || process.cwd());
    const rel = path.relative(base, target);
    return rel === '' ? '.' : rel.split(path.sep).join('/');
}
const ls = (args, ctx) => {
    const denied = needPermission(ctx, 'list');
    if (denied)
        return denied;
    const target = resolveTarget(ctx, args[0]);
    if (!insideHome(ctx, target))
        return err(`outside home: ${relativeTo(ctx, target)}`);
    if (!fs.existsSync(target))
        return err(`no such path: ${relativeTo(ctx, target)}`);
    const stat = fs.statSync(target);
    if (stat.isFile()) {
        return { lines: [`- ${formatSize(stat.size).padStart(9)}  ${path.basename(target)}`] };
    }
    const entries = fs
        .readdirSync(target, { withFileTypes: true })
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    if (entries.length === 0)
        return { lines: [`${(0, palette_1.cyan)(relativeTo(ctx, target))} ${(0, palette_1.faint)('(empty)')}`] };
    const rows = entries.map((entry) => {
        const full = path.join(target, entry.name);
        const size = entry.isFile() ? fs.statSync(full).size : 0;
        const type = entry.isDirectory() ? 'd' : '-';
        const name = entry.isDirectory() ? `${(0, palette_1.cyan)(entry.name)}/` : entry.name;
        return `${(0, palette_1.bold)(type.padEnd(4))} ${formatSize(size).padStart(9)}  ${name}`;
    });
    return {
        lines: [
            `${(0, palette_1.bold)('TYPE'.padEnd(4))} ${(0, palette_1.bold)('SIZE'.padStart(9))}  ${(0, palette_1.bold)('NAME')}`,
            (0, palette_1.faint)(`${'─'.repeat(4)} ${'─'.repeat(9)}  ${'─'.repeat(20)}`),
            ...rows,
        ],
    };
};
const pwd = (_args, ctx) => {
    return { lines: [(0, palette_1.cyan)(ctx.currentDir || ctx.homeDir || process.cwd())] };
};
const cd = (args, ctx) => {
    const denied = needPermission(ctx, 'list');
    if (denied)
        return denied;
    if (!args[0])
        return usage('cd');
    const target = resolveTarget(ctx, args[0]);
    if (!insideHome(ctx, target))
        return err('outside home directory');
    if (!fs.existsSync(target))
        return err(`no such directory: ${relativeTo(ctx, target)}`);
    if (!fs.statSync(target).isDirectory())
        return err(`not a directory: ${relativeTo(ctx, target)}`);
    ctx.currentDir = target;
    return { lines: [`${(0, palette_1.cyan)(relativeTo(ctx, target))}`] };
};
const mkdir = (args, ctx) => {
    const denied = needPermission(ctx, 'mkd');
    if (denied)
        return denied;
    if (!args[0])
        return usage('mkdir');
    const target = resolveTarget(ctx, args[0]);
    if (!insideHome(ctx, target))
        return err('outside home directory');
    if (fs.existsSync(target))
        return err(`already exists: ${relativeTo(ctx, target)}`);
    fs.mkdirSync(target, { recursive: true });
    return { lines: [ok(`created ${relativeTo(ctx, target)}/`)] };
};
const rm = (args, ctx) => {
    if (!args[0])
        return usage('rm');
    const flags = args.filter((arg) => arg.startsWith('-'));
    const names = args.filter((arg) => !arg.startsWith('-'));
    if (names.length === 0)
        return usage('rm');
    const recursive = flags.some((flag) => flag.includes('r'));
    const target = resolveTarget(ctx, names[0]);
    if (!insideHome(ctx, target))
        return err('outside home directory');
    if (!fs.existsSync(target))
        return err(`no such path: ${relativeTo(ctx, target)}`);
    const isDirectory = fs.statSync(target).isDirectory();
    const denied = needPermission(ctx, isDirectory ? 'rmdir' : 'delete');
    if (denied)
        return denied;
    if (isDirectory && !recursive) {
        return {
            lines: [
                `${(0, palette_1.red)('✗')} ${relativeTo(ctx, target)} is a directory`,
                hint(`use: rm -r ${relativeTo(ctx, target)}`),
            ],
        };
    }
    if (isDirectory)
        fs.rmSync(target, { recursive: true, force: false });
    else
        fs.unlinkSync(target);
    return { lines: [ok(`removed ${relativeTo(ctx, target)}`)] };
};
const mv = (args, ctx) => {
    const denied = needPermission(ctx, 'rename');
    if (denied)
        return denied;
    if (args.length < 2)
        return usage('mv');
    const from = resolveTarget(ctx, args[0]);
    const to = resolveTarget(ctx, args[1]);
    if (!insideHome(ctx, from) || !insideHome(ctx, to))
        return err('outside home directory');
    if (!fs.existsSync(from))
        return err(`no such path: ${relativeTo(ctx, from)}`);
    if (fs.existsSync(to))
        return err(`already exists: ${relativeTo(ctx, to)}`);
    fs.renameSync(from, to);
    return { lines: [ok(`${relativeTo(ctx, from)} -> ${relativeTo(ctx, to)}`)] };
};
const LINUX_PERM = /^[rwx-]{9}$/;
async function promptPermissions(ctx) {
    const bits = [];
    const labels = [
        'Owner Read',
        'Owner Write',
        'Owner Execute',
        'Group Read',
        'Group Write',
        'Group Execute',
        'Others Read',
        'Others Write',
        'Others Execute',
    ];
    for (let i = 0; i < 9; i += 1) {
        const label = labels[i];
        const yn = (await (0, ui_1.ask)(`  ${label} [y/n]: `)).trim().toLowerCase();
        bits[i] = yn === 'y' || yn === 'yes' ? (i % 3 === 0 ? 'r' : i % 3 === 1 ? 'w' : 'x') : '-';
    }
    const result = bits.join('');
    if (!LINUX_PERM.test(result)) {
        return 'rwxr-xr-x';
    }
    return result;
}
function parseFlags(args, spec) {
    const values = {};
    const flags = new Set();
    const positional = [];
    const valueKeys = spec.values ?? [];
    const boolKeys = spec.bools ?? [];
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (!arg.startsWith('--')) {
            positional.push(arg);
            continue;
        }
        const key = arg.slice(2);
        if (boolKeys.includes(key)) {
            flags.add(key);
            continue;
        }
        if (valueKeys.includes(key)) {
            const value = args[i + 1];
            if (value === undefined || value.startsWith('--')) {
                return { values, flags, positional, error: `missing value for --${key}` };
            }
            values[key] = value;
            i += 1;
            continue;
        }
        return { values, flags, positional, error: `unknown option: ${arg}` };
    }
    return { values, flags, positional };
}
function normalizePath(p) {
    if (!p)
        return '.';
    if (p.match(/^[A-Za-z]:(\\\\\/|$)/)) {
        return path.win32.normalize(p.replace(/\//g, '\\\\'));
    }
    if (p.startsWith('/') || p.startsWith('./') || p.startsWith('../')) {
        return path.posix.normalize(p);
    }
    return path.win32.normalize(p);
}
function userRows(ctx) {
    const users = ctx.server.getUserManager()?.listUsers(true) ?? [];
    const db = ctx.server.getDb();
    const rows = users.map((user) => {
        const name = user.username.padEnd(16);
        const status = (user.isActive ? 'active' : 'disabled').padEnd(10);
        return `${user.isActive ? (0, palette_1.cyan)(name) : (0, palette_1.yellow)(name)}  ${user.isActive ? (0, palette_1.green)(status) : (0, palette_1.yellow)(status)}  ${(0, palette_1.bold)(db.toLinuxString(user.permissions))}  ${(0, palette_1.dim)(user.homeDir)}`;
    });
    return [
        `${(0, palette_1.bold)('USER'.padEnd(16))}  ${(0, palette_1.bold)('STATUS'.padEnd(10))}  ${(0, palette_1.bold)('PERMS')}  ${(0, palette_1.bold)('HOME')}`,
        (0, palette_1.faint)(`${'─'.repeat(16)}  ${'─'.repeat(10)}  ${'─'.repeat(9)}  ${'─'.repeat(20)}`),
        ...rows,
    ];
}
const listUsers = (_args, ctx) => {
    const userManager = ctx.server.getUserManager();
    if (!userManager)
        return err('user manager not initialized');
    return { lines: userRows(ctx) };
};
const addUser = async (args, ctx) => {
    const userManager = ctx.server.getUserManager();
    if (!userManager)
        return err('user manager not initialized');
    const db = ctx.server.getDb();
    const parsed = parseFlags(args, { values: ['username', 'password', 'home', 'perm'] });
    if (parsed.error)
        return err(parsed.error);
    if (parsed.positional.length > 0) {
        return err(`unexpected argument: ${parsed.positional[0]} ${(0, palette_1.faint)('(use --username, --password, --home, --perm)')}`);
    }
    let name = parsed.values.username;
    let password = parsed.values.password;
    let home = parsed.values.home;
    let perms = parsed.values.perm;
    if (name === undefined)
        name = (await (0, ui_1.ask)('  Username: ')).trim();
    if (!name)
        return err('username required');
    if (userManager.findUser(name, true))
        return err(`user already exists: ${name}`);
    if (password === undefined)
        password = (await (0, ui_1.askSecret)('  Password: ')).trim();
    if (!password)
        return err('password required');
    if (home === undefined)
        home = normalizePath((await (0, ui_1.ask)('  Home [./]: ')).trim()) || './';
    if (perms === undefined)
        perms = await promptPermissions(ctx);
    if (!LINUX_PERM.test(perms)) {
        return err(`bad permission string: ${perms} ${(0, palette_1.faint)('(expected rwxr-xr-x)')}`);
    }
    const homeDir = resolveTarget(ctx, home);
    if (!fs.existsSync(homeDir))
        fs.mkdirSync(homeDir, { recursive: true });
    const permissions = db.fromLinuxString(perms);
    const added = userManager.addUser(name, password, homeDir, permissions);
    if (!added)
        return err(`could not create user: ${name}`);
    return {
        lines: [
            ok(`user ${name} created`),
            `  ${(0, palette_1.dim)('home  ')} ${homeDir}`,
            `  ${(0, palette_1.dim)('perms ')} ${(0, palette_1.bold)(perms)}`,
        ],
    };
};
const deleteUser = async (args, ctx) => {
    const userManager = ctx.server.getUserManager();
    if (!userManager)
        return err('user manager not initialized');
    const parsed = parseFlags(args, { values: ['username'] });
    if (parsed.error)
        return err(parsed.error);
    if (parsed.positional.length > 0) {
        return err(`unexpected argument: ${parsed.positional[0]} ${(0, palette_1.faint)('(use --username <name>)')}`);
    }
    let name = parsed.values.username;
    if (name === undefined)
        name = (await (0, ui_1.ask)('  Username: ')).trim();
    if (!name)
        return err('username required');
    if (!userManager.findUser(name, true))
        return err(`no such user: ${name}`);
    const account = userManager.findUser(name, true);
    const homeDir = account?.homeDir ?? ctx.homeDir;
    const removed = userManager.deleteUser(name);
    if (!removed)
        return err(`could not delete user: ${name}`);
    if (homeDir && homeDir !== '.' && homeDir !== process.cwd()) {
        try {
            if (fs.existsSync(homeDir)) {
                fs.rmSync(homeDir, { recursive: true, force: true });
            }
        }
        catch (e) {
            logger_1.Logger.error(`[deleteUser] Failed to remove home dir ${homeDir}:`, e);
        }
    }
    if (ctx.user === name)
        ctx.user = null;
    return { lines: [ok(`user ${name} deleted`)] };
};
async function promptUpdate(ctx) {
    const userManager = ctx.server.getUserManager();
    if (!userManager)
        return err('user manager not initialized');
    const db = ctx.server.getDb();
    const name = (await (0, ui_1.ask)('  Username: ')).trim();
    if (!name)
        return err('username required');
    const account = userManager.findUser(name, true);
    if (!account)
        return err(`no such user: ${name}`);
    const password = (await (0, ui_1.askSecret)('  Password (Enter = keep): ')).trim();
    const currentHome = account.homeDir;
    const home = normalizePath((await (0, ui_1.ask)(`  Home [${currentHome}]: `)).trim());
    const currentPerm = db.toLinuxString(account.permissions);
    const perms = await promptPermissions(ctx);
    if (perms !== '' && !LINUX_PERM.test(perms)) {
        return err(`bad permission string: ${perms} ${(0, palette_1.faint)('(expected rwxr-xr-x)')}`);
    }
    const lines = [];
    if (password !== '') {
        lines.push(userManager.changePassword(name, password)
            ? ok(`${name}: password updated`)
            : `${(0, palette_1.red)('✗')} ${name}: password could not be updated`);
    }
    if (home !== '') {
        const homeDir = resolveTarget(ctx, home);
        if (path.resolve(homeDir) !== path.resolve(currentHome)) {
            if (!fs.existsSync(homeDir))
                fs.mkdirSync(homeDir, { recursive: true });
            lines.push(userManager.changeHomeDir(name, homeDir)
                ? ok(`${name}: home -> ${homeDir}`)
                : `${(0, palette_1.red)('✗')} ${name}: home could not be updated`);
        }
    }
    if (perms !== '' && perms !== currentPerm) {
        lines.push(userManager.updatePermissions(name, db.fromLinuxString(perms))
            ? ok(`${name}: perm -> ${perms}`)
            : `${(0, palette_1.red)('✗')} ${name}: permissions could not be updated`);
    }
    const statusYn = (await (0, ui_1.ask)(`  Status [${account.isActive ? 'active' : 'inactive'}] (y/n): `)).trim().toLowerCase();
    let newStatus;
    if (statusYn === 'y' || statusYn === 'yes') {
        newStatus = true;
    }
    else if (statusYn === 'n' || statusYn === 'no') {
        newStatus = false;
    }
    else {
        newStatus = undefined;
    }
    if (newStatus !== undefined && newStatus !== account.isActive) {
        lines.push(userManager.toggleUserStatus(name, newStatus)
            ? ok(`${name}: ${newStatus ? 'enabled' : 'disabled'}`)
            : `${(0, palette_1.red)('✗')} ${name}: status could not be updated`);
    }
    if (lines.length === 0)
        lines.push(`${(0, palette_1.yellow)('!')} nothing changed for ${name}`);
    return { lines };
}
const updateUser = (args, ctx) => {
    if (args.length === 0)
        return promptUpdate(ctx);
    const userManager = ctx.server.getUserManager();
    if (!userManager)
        return err('user manager not initialized');
    const db = ctx.server.getDb();
    const parsed = parseFlags(args, {
        values: ['username', 'new-username', 'password', 'home', 'perm'],
        bools: ['enable', 'disable'],
    });
    if (parsed.error)
        return err(parsed.error);
    if (parsed.positional.length > 1) {
        return err(`unexpected argument: ${parsed.positional[1]}`);
    }
    const name = parsed.positional[0] ?? parsed.values.username;
    if (!name)
        return usage('update --username <name>');
    if (!userManager.findUser(name, true))
        return err(`no such user: ${name}`);
    if (parsed.flags.has('enable') && parsed.flags.has('disable')) {
        return err('use either --enable or --disable, not both');
    }
    const changes = {};
    const newUsername = parsed.positional.length > 0
        ? parsed.values.username ?? parsed.values['new-username']
        : parsed.values['new-username'];
    if (newUsername !== undefined)
        changes.username = newUsername;
    if (parsed.values.password !== undefined)
        changes.password = parsed.values.password;
    if (parsed.values.home !== undefined)
        changes.home = parsed.values.home;
    if (parsed.values.perm !== undefined) {
        if (!LINUX_PERM.test(parsed.values.perm)) {
            return err(`bad permission string: ${parsed.values.perm} ${(0, palette_1.faint)('(expected rwxr-xr-x)')}`);
        }
        changes.perm = parsed.values.perm;
    }
    if (parsed.flags.has('enable'))
        changes.status = true;
    if (parsed.flags.has('disable'))
        changes.status = false;
    if (Object.keys(changes).length === 0) {
        return {
            lines: [
                `${(0, palette_1.yellow)('!')} nothing to update for ${name}`,
                hint('update --username alice --password new --perm rwxr-xr-x'),
            ],
        };
    }
    const applied = [];
    const failed = [];
    if (changes.password !== undefined) {
        (userManager.changePassword(name, changes.password) ? applied : failed).push('password');
    }
    if (changes.home !== undefined) {
        const homeDir = resolveTarget(ctx, changes.home);
        if (!fs.existsSync(homeDir))
            fs.mkdirSync(homeDir, { recursive: true });
        (userManager.changeHomeDir(name, homeDir) ? applied : failed).push(`home -> ${homeDir}`);
    }
    if (changes.perm !== undefined) {
        (userManager.updatePermissions(name, db.fromLinuxString(changes.perm)) ? applied : failed)
            .push(`perm -> ${changes.perm}`);
    }
    if (changes.status !== undefined) {
        (userManager.toggleUserStatus(name, changes.status) ? applied : failed)
            .push(changes.status ? 'enabled' : 'disabled');
    }
    if (changes.username !== undefined) {
        if (userManager.findUser(changes.username, true))
            failed.push(`username "${changes.username}" already exists`);
        else
            (userManager.changeUsername(name, changes.username) ? applied : failed)
                .push(`username -> ${changes.username}`);
    }
    const lines = [];
    for (const change of applied)
        lines.push(ok(`${name}: ${change}`));
    for (const change of failed)
        lines.push(`${(0, palette_1.red)('✗')} ${name}: ${change}`);
    return { lines };
};
const CONFIG_KEYS = [
    'port',
    'dataPort',
    'maxConnections',
    'logLevel',
    'banner',
    'passivePortRange',
    'passiveIp',
    'ip',
    'dbPath',
];
const RESTART_KEYS = ['port', 'dataPort', 'maxConnections', 'passivePortRange', 'ip', 'passiveIp'];
function isConfigKey(value) {
    const needle = value.toLowerCase().replace(/^ftp\./, '');
    return CONFIG_KEYS.find((key) => key.toLowerCase() === needle) ?? null;
}
function formatSettingValue(key, cfg) {
    switch (key) {
        case 'passivePortRange':
            return `${cfg.passivePortRange.min}:${cfg.passivePortRange.max}`;
        case 'banner': {
            const banner = cfg.banner ?? '';
            return banner.length > 52 ? `${banner.slice(0, 49)}...` : banner;
        }
        case 'passiveIp':
            return cfg.passiveIp?.trim() ? cfg.passiveIp : '(auto)';
        case 'ip':
            return cfg.ip?.trim() ? cfg.ip : '(auto)';
        case 'dbPath':
            return cfg.dbPath ?? '';
        default:
            return String(cfg[key]);
    }
}
function parseSettingValue(key, raw) {
    const text = raw.trim();
    if (key === 'dbPath')
        return { ok: false, error: 'dbPath is read-only (constructor option)' };
    if (key === 'port' || key === 'dataPort') {
        const num = Number(text);
        if (!Number.isInteger(num) || num < 1 || num > 65535) {
            return { ok: false, error: `${key} must be 1-65535` };
        }
        return { ok: true, value: num };
    }
    if (key === 'maxConnections') {
        const num = Number(text);
        if (!Number.isInteger(num) || num < 1)
            return { ok: false, error: 'maxConnections must be >= 1' };
        return { ok: true, value: num };
    }
    if (key === 'logLevel') {
        const level = text.toLowerCase();
        if (!['debug', 'info', 'warn', 'error'].includes(level)) {
            return { ok: false, error: 'logLevel must be debug | info | warn | error' };
        }
        return { ok: true, value: level };
    }
    if (key === 'passivePortRange') {
        const match = text.match(/^(\d{1,5})\s*[:\-\s]\s*(\d{1,5})$/);
        if (!match)
            return { ok: false, error: 'expected min:max (e.g. 50000:50050)' };
        const min = Number(match[1]);
        const max = Number(match[2]);
        if (min < 1 || max > 65535 || min > max)
            return { ok: false, error: 'invalid port range' };
        return { ok: true, value: { min, max } };
    }
    if (key === 'banner') {
        if (text === '')
            return { ok: false, error: 'banner cannot be empty (omit to reset)' };
        return { ok: true, value: text };
    }
    if (text === '')
        return { ok: false, error: `${key} cannot be empty (use auto for automatic)` };
    return { ok: true, value: text.toLowerCase() === 'auto' ? '' : text };
}
function configShow(args, ctx) {
    const cfg = ctx.server.getRuntimeConfig();
    const lines = CONFIG_KEYS.map((key) => {
        const star = RESTART_KEYS.includes(key) ? (0, palette_1.faint)('*') : '';
        return `  ${(0, palette_1.bold)(key.padEnd(17))} ${formatSettingValue(key, cfg)} ${star}`;
    });
    lines.push('');
    lines.push((0, palette_1.faint)('  * restart required to take effect'));
    return { lines };
}
function configGet(args, ctx) {
    if (!args[0])
        return usage('config get <key>');
    const key = isConfigKey(args[0]);
    if (!key)
        return err(`unknown setting: ${args[0]}`);
    const cfg = ctx.server.getRuntimeConfig();
    return { lines: [`${(0, palette_1.cyan)(key)} = ${formatSettingValue(key, cfg)}`] };
}
function configSet(args, ctx) {
    if (args.length < 1)
        return usage('config set <key> <value>');
    const key = isConfigKey(args[0]);
    if (!key)
        return err(`unknown setting: ${args[0]} ${(0, palette_1.faint)('(try: config show)')}`);
    const raw = args.slice(1).join(' ').trim();
    if (raw === '')
        return usage(`config set ${key} <value>`);
    const parsed = parseSettingValue(key, raw);
    if (!parsed.ok)
        return err(parsed.error);
    ctx.server.updateSetting(key, parsed.value);
    const cfg = ctx.server.getRuntimeConfig();
    let restartMsg = '';
    if (RESTART_KEYS.includes(key)) {
        ctx.server.stop();
        ctx.server.start();
        restartMsg = ` ${(0, palette_1.faint)('· restart required and applied')}`;
    }
    else {
        restartMsg = ` ${(0, palette_1.faint)('· no restart required')}`;
    }
    return { lines: [ok(`${key} = ${formatSettingValue(key, cfg)}${restartMsg}`)] };
}
function configUnset(args, ctx) {
    if (!args[0])
        return usage('config unset <key>');
    const key = isConfigKey(args[0]);
    if (!key)
        return err(`unknown setting: ${args[0]}`);
    const removed = ctx.server.clearSetting(key);
    if (!removed)
        return err(`${key} is not stored in the database`);
    let restartMsg = '';
    if (RESTART_KEYS.includes(key)) {
        ctx.server.stop();
        ctx.server.start();
        restartMsg = ` ${(0, palette_1.faint)('· restart applied')}`;
    }
    else {
        restartMsg = ` ${(0, palette_1.faint)('· default value used after restart')}`;
    }
    return {
        lines: [
            ok(`${key} removed from settings${restartMsg}`),
            hint('the default value is used after restart'),
        ],
    };
}
function configPath(_args, ctx) {
    const cfg = ctx.server.getRuntimeConfig();
    const label = (text) => `  ${(0, palette_1.bold)(text.padEnd(8))} `;
    return {
        lines: [
            `${label('database')} ${cfg.dbPath ?? './ftpd.db'}`,
            `${label('tables')} users, settings, logs`,
            `${label('history')} ${path.join(process.cwd(), '.ftpd_history')}`,
        ],
    };
}
const CONFIG_MENU_CHOICES = {
    logLevel: ['debug', 'info', 'warn', 'error'],
};
const CONFIG_CLEAR_LOGS_INDEX = CONFIG_KEYS.length + 1;
const CONFIG_BACK_INDEX = CONFIG_KEYS.length + 2;
function countLogs(ctx) {
    try {
        return ctx.server.getDb().getLogCount() + logger_1.Logger.getBufferedCount();
    }
    catch {
        return logger_1.Logger.getBufferedCount();
    }
}
async function clearLogsWithConfirmation(ctx) {
    const total = countLogs(ctx);
    if (total === 0) {
        return { lines: [hint('logs table is already empty')] };
    }
    const answer = (await (0, ui_1.ask)(`Delete all ${total} log records? [y/n]: `)).trim().toLowerCase();
    if (answer !== 'y' && answer !== 'yes') {
        return { lines: [`${(0, palette_1.yellow)('!')} log deletion cancelled`] };
    }
    try {
        logger_1.Logger.discardBuffered();
        const deleted = ctx.server.getDb().clearLogs();
        return { lines: [ok(`logs cleared (${deleted} rows deleted)`)] };
    }
    catch (error) {
        return err(`could not clear logs: ${error.message}`);
    }
}
async function showConfigMenu(ctx) {
    for (;;) {
        const cfg = ctx.server.getRuntimeConfig();
        console.log('');
        CONFIG_KEYS.forEach((key, index) => {
            const value = formatSettingValue(key, cfg);
            const note = key === 'dbPath'
                ? (0, palette_1.faint)('(read-only)')
                : RESTART_KEYS.includes(key)
                    ? (0, palette_1.faint)('*')
                    : '';
            console.log(`  [${index + 1}] ${(0, palette_1.cyan)(key.padEnd(17))} ${(0, palette_1.dim)(value)} ${note}`);
        });
        console.log(`  [${CONFIG_CLEAR_LOGS_INDEX}] ${(0, palette_1.cyan)('Clear logs'.padEnd(17))} ${(0, palette_1.dim)(`${countLogs(ctx)} rows`)}`);
        console.log(`  [${CONFIG_BACK_INDEX}] ${(0, palette_1.dim)('Back')}`);
        console.log('');
        console.log((0, palette_1.faint)(`  * restart required to take effect`));
        console.log('');
        const choice = (await (0, ui_1.ask)(`Select an option [1-${CONFIG_BACK_INDEX}]: `)).trim();
        if (choice === '' || choice === '0' || choice === String(CONFIG_BACK_INDEX)) {
            return { lines: [] };
        }
        if (choice === String(CONFIG_CLEAR_LOGS_INDEX)) {
            return clearLogsWithConfirmation(ctx);
        }
        const index = Number(choice) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= CONFIG_KEYS.length) {
            console.log(`${(0, palette_1.red)('✗')} Invalid option. Please select 1-${CONFIG_BACK_INDEX}.`);
            continue;
        }
        const key = CONFIG_KEYS[index];
        if (key === 'dbPath') {
            console.log(`${(0, palette_1.yellow)('!')} dbPath is read-only (constructor option).`);
            continue;
        }
        let value;
        const choices = CONFIG_MENU_CHOICES[key];
        if (choices) {
            console.log('');
            choices.forEach((choiceText, i) => console.log(`    [${i + 1}] ${(0, palette_1.cyan)(choiceText)}`));
            console.log('');
            const pick = (await (0, ui_1.ask)(`  ${key} [1-${choices.length}] (Enter keeps current): `)).trim();
            if (pick === '')
                continue;
            const picked = Number(pick) - 1;
            if (!Number.isInteger(picked) || picked < 0 || picked >= choices.length) {
                console.log(`${(0, palette_1.red)('✗')} Invalid choice. Please select 1-${choices.length}.`);
                continue;
            }
            value = choices[picked];
        }
        else {
            const current = formatSettingValue(key, cfg);
            const answer = (await (0, ui_1.ask)(`${key} [${current}]: `)).trim();
            if (answer === '')
                continue;
            value = answer;
        }
        const result = configSet([key, value], ctx);
        for (const line of result.lines)
            console.log(line);
        console.log('');
        return { lines: [] };
    }
}
const configCommand = async (args, ctx) => {
    if (args.length === 0)
        return showConfigMenu(ctx);
    const sub = args[0].toLowerCase();
    const rest = args.slice(1);
    switch (sub) {
        case 'show':
        case 'list':
            return configShow(rest, ctx);
        case 'menu':
            return showConfigMenu(ctx);
        case 'get':
            return configGet(rest, ctx);
        case 'set':
            return configSet(rest, ctx);
        case 'unset':
        case 'delete':
            return configUnset(rest, ctx);
        case 'path':
            return configPath(rest, ctx);
        default:
            return {
                lines: [
                    `${(0, palette_1.red)('✗')} unknown config subcommand: ${sub}`,
                    hint('config | config show | get | set | unset | path'),
                ],
            };
    }
};
const status = (_args, ctx) => {
    const cfg = ctx.server.getRuntimeConfig();
    const listening = ctx.server.isListening();
    const userManager = ctx.server.getUserManager();
    const users = userManager?.getUserCount() ?? 0;
    const label = (text) => `  ${(0, palette_1.bold)(text.padEnd(8))} `;
    return {
        lines: [
            `${label('server')} ${listening ? (0, palette_1.green)('listening') : (0, palette_1.red)('stopped')} ${(0, palette_1.faint)('on')} :${cfg.port} ${(0, palette_1.faint)('data')} :${cfg.dataPort}`,
            `${label('clients')} ${ctx.server.getConnectionCount()} / ${cfg.maxConnections}`,
            `${label('log')} ${cfg.logLevel}`,
            `${label('pasv')} ${cfg.passivePortRange.min}:${cfg.passivePortRange.max} ${cfg.passiveIp ? (0, palette_1.dim)(`(${cfg.passiveIp})`) : ''}`,
            `${label('banner')} ${cfg.banner}`,
            `${label('users')} ${users} in ${cfg.dbPath ?? './ftpd.db'}`,
            `${label('session')} ${ctx.user ? (0, palette_1.cyan)(ctx.user) : (0, palette_1.yellow)('none')} ${(0, palette_1.faint)('@')} ${(0, palette_1.dim)(ctx.currentDir || ctx.homeDir || '-')}`,
        ],
    };
};
const whoami = (_args, ctx) => {
    const user = ctx.user;
    if (!user) {
        return { lines: [(0, palette_1.yellow)('!') + ' no session account'] };
    }
    const account = ctx.server.getUserManager()?.findUser(user, true);
    const label = (text) => `  ${(0, palette_1.bold)(text.padEnd(6))} `;
    return {
        lines: [
            `${label('user')} ${(0, palette_1.cyan)(user)} ${account?.isActive ? (0, palette_1.green)('(active)') : (0, palette_1.yellow)('(disabled)')}`,
            `${label('home')} ${(0, palette_1.dim)(account?.homeDir ?? ctx.homeDir)}`,
            `${label('cwd')} ${(0, palette_1.dim)(ctx.currentDir || ctx.homeDir)}`,
            `${label('perms')} ${(0, palette_1.bold)(permissionString(ctx, user))} ${(0, palette_1.faint)('(owner/group/others)')}`,
        ],
    };
};
const startServer = (args, ctx) => {
    const server = ctx.server;
    const cfg = server.getRuntimeConfig();
    if (server.isListening()) {
        return { lines: [`${(0, palette_1.yellow)('!')} server already running on port ${cfg.port}`] };
    }
    server.start();
    return { lines: [`${(0, palette_1.green)('✓')} FTP server started on port ${cfg.port}`] };
};
const stopServer = (args, ctx) => {
    const server = ctx.server;
    const cfg = server.getRuntimeConfig();
    if (!server.isListening()) {
        return { lines: [`${(0, palette_1.yellow)('!')} server not running`] };
    }
    server.stop();
    return { lines: [`${(0, palette_1.green)('✓')} FTP server stopped`] };
};
const restartServer = (args, ctx) => {
    const server = ctx.server;
    const cfg = server.getRuntimeConfig();
    if (server.isListening()) {
        server.stop();
    }
    server.start();
    return { lines: [`${(0, palette_1.green)('✓')} FTP server restarted`] };
};
const handlers = {
    help: (args, _ctx) => {
        if (args[0])
            (0, help_1.printCommandHelp)(args[0]);
        else
            (0, help_1.printHelp)();
        return { lines: [] };
    },
    clear: () => ({ lines: [], clear: true }),
    version: () => ({ lines: [(0, logo_1.logoTiny)()] }),
    exit: () => ({ lines: [], exit: true }),
    start: startServer,
    stop: stopServer,
    restart: restartServer,
    status,
    whoami,
    pwd,
    cd,
    mkdir,
    rm,
    mv,
    list: listUsers,
    add: addUser,
    del: deleteUser,
    update: updateUser,
    config: configCommand,
};
async function handleFtpCommand(rawLine, ctx) {
    const tokens = tokenize((rawLine || '').trim());
    if (tokens.length === 0)
        return { lines: [] };
    const command = findCommand(tokens[0]);
    if (!command) {
        return {
            lines: [
                `${(0, palette_1.red)('✗')} unknown command: ${tokens[0]}`,
                hint('type help to list the commands'),
            ],
        };
    }
    const handler = handlers[command.name];
    if (!handler)
        return err(`command not implemented: ${command.name}`);
    try {
        return await handler(tokens.slice(1), ctx);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(message);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY2xpL3JlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQVksRUFBRSwrQkFBVztBQUN6QixNQUFZLElBQUksaUNBQWE7QUFJN0IsNkNBQTZFO0FBQzdFLHVDQUF3QztBQUN4QyxpQ0FBcUQ7QUFDckQsNkJBQXNDO0FBRXRDLDRDQUF5QztBQXFCNUIsUUFBQSxRQUFRLEdBQWlCO0lBRXBDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFO0lBQ2pHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFO0lBQ2hGLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRTtJQUNoRixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRTtJQUNoRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLHFDQUFxQyxFQUFFO0lBQy9ILEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FB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QUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFBLGNBQUksRUFBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsSUFBSSxJQUFBLGVBQUssRUFBQyxHQUFHLENBQUMsSUFBSSxJQUFBLGFBQUcsRUFBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLEVBQUU7U0FDL0g7S0FDRixDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBRUYsTUFBTSxNQUFNLEdBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFFckMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQTBCLENBQUM7SUFDNUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLElBQUEsZ0JBQU0sRUFBQyxHQUFHLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7SUFDMUQsQ0FBQztJQUNELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRSxNQUFNLEtBQUssR0FBRyxDQUFDLElBQVksRUFBVSxFQUFFLENBQUMsS0FBSyxJQUFBLGNBQUksRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUNyRSxPQUFPO1FBQ0wsS0FBSyxFQUFFO1lBQ0wsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksSUFBQSxjQUFJLEVBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBQSxlQUFLLEVBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsZ0JBQU0sRUFBQyxZQUFZLENBQUMsRUFBRTtZQUNoRyxHQUFHLEtBQUssQ0FB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TSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxJQUFJLENBQUMsT0FBTztRQUFFLE9BQU8sR0FBRyxDQUFDLDRCQUE0QixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUVyRSxJQUFJLENBQUM7UUFDSCxPQUFPLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixNQUFNLE9BQU8sR0FBRyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkUsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEIsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgeyBGdHBDbGlDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7IHR5cGUgU2V0dGluZ0tleSwgdHlwZSBJbnRlcm5hbFNlcnZlckNvbmZpZyB9IGZyb20gJy4uL2NvcmUvRnRwU2VydmVyJztcbmltcG9ydCB7IGJvbGQsIGN5YW4sIGRpbSwgZmFpbnQsIGdyZWVuLCByZWQsIHllbGxvdyB9IGZyb20gJy4vdGhlbWUvcGFsZXR0ZSc7XG5pbXBvcnQgeyBsb2dvVGlueSB9IGZyb20gJy4vdGhlbWUvbG9nbyc7XG5pbXBvcnQgeyBwcmludEhlbHAsIHByaW50Q29tbWFuZEhlbHAgfSBmcm9tICcuL2hlbHAnO1xuaW1wb3J0IHsgYXNrLCBhc2tTZWNyZXQgfSBmcm9tICcuL3VpJztcbmltcG9ydCB0eXBlIHsgUGVybWlzc2lvbiwgVXNlclBlcm1pc3Npb25zIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgS09NVVQgS0FZSVQgREVGVEVSxLAgKHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGgpXG4gICAtIGhlbHAgc2F5ZmFzxLEsIHRhYiB0YW1hbWxhbWEgdmUgZGlzcGF0Y2hlciBidSBsaXN0ZXlpIGt1bGxhbsSxclxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEZ0cENvbW1hbmRSZXN1bHQge1xuICBsaW5lczogc3RyaW5nW107XG4gIGNsZWFyPzogYm9vbGVhbjtcbiAgZXhpdD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpQ29tbWFuZCB7XG4gIG5hbWU6IHN0cmluZztcbiAgYWxpYXNlcz86IHN0cmluZ1tdO1xuICBncm91cDogc3RyaW5nO1xuICB1c2FnZTogc3RyaW5nO1xuICBzdW1tYXJ5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBDT01NQU5EUzogQ2xpQ29tbWFuZFtdID0gW1xuICAvLyBTZXNzaW9uXG4gIHsgbmFtZTogJ2hlbHAnLCBhbGlhc2VzOiBbJz8nXSwgZ3JvdXA6ICdTZXNzaW9uJywgdXNhZ2U6ICdoZWxwIFtjb21tYW5kXScsIHN1bW1hcnk6ICdTaG93IGhlbHAnIH0sXG4gIHsgbmFtZTogJ2NsZWFyJywgZ3JvdXA6ICdTZXNzaW9uJywgdXNhZ2U6ICdjbGVhcicsIHN1bW1hcnk6ICdDbGVhciB0aGUgc2NyZWVuJyB9LFxuICB7IG5hbWU6ICd2ZXJzaW9uJywgZ3JvdXA6ICdTZXNzaW9uJywgdXNhZ2U6ICd2ZXJzaW9uJywgc3VtbWFyeTogJ1Nob3cgdmVyc2lvbicgfSxcbiAgeyBuYW1lOiAnc3RhdHVzJywgZ3JvdXA6ICdTZXNzaW9uJywgdXNhZ2U6ICdzdGF0dXMnLCBzdW1tYXJ5OiAnU2hvdyBzZXJ2ZXIgYW5kIHNlc3Npb24gc3RhdHVzJyB9LFxuICB7IG5hbWU6ICdleGl0JywgYWxpYXNlczogWydxdWl0JywgJ3EnLCAnOnEnXSwgZ3JvdXA6ICdTZXNzaW9uJywgdXNhZ2U6ICdleGl0Jywgc3VtbWFyeTogJ1N0b3AgdGhlIHNlcnZlciBhbmQgbGVhdmUgdGhlIHNoZWxsJyB9LFxuICB7IG5hbWU6ICdzdGFydCcsIGdyb3VwOiAnU2Vzc2lvbicsIHVzYWdlOiAnc3RhcnQnLCBzdW1tYXJ5OiAnU3RhcnQgdGhlIEZUUCBzZXJ2ZXInIH0sXG4gIHsgbmFtZTogJ3N0b3AnLCBncm91cDogJ1Nlc3Npb24nLCB1c2FnZTogJ3N0b3AnLCBzdW1tYXJ5OiAnU3RvcCB0aGUgRlRQIHNlcnZlcicgfSxcbiAgeyBuYW1lOiAncmVzdGFydCcsIGdyb3VwOiAnU2Vzc2lvbicsIHVzYWdlOiAncmVzdGFydCcsIHN1bW1hcnk6ICdSZXN0YXJ0IHRoZSBGVFAgc2VydmVyJyB9LFxuXG4gIC8vIEZpbGVzXG4gIHsgbmFtZTogJ2xzJywgYWxpYXNlczogWydkaXInXSwgZ3JvdXA6ICdGaWxlcycsIHVzYWdlOiAnbHMgW3BhdGhdJywgc3VtbWFyeTogJ0xpc3QgYSBkaXJlY3RvcnknIH0sXG4gIHsgbmFtZTogJ3B3ZCcsIGdyb3VwOiAnRmlsZXMnLCB1c2FnZTogJ3B3ZCcsIHN1bW1hcnk6ICdQcmludCB0aGUgd29ya2luZyBkaXJlY3RvcnknIH0sXG4gIHsgbmFtZTogJ2NkJywgZ3JvdXA6ICdGaWxlcycsIHVzYWdlOiAnY2QgPHBhdGg+Jywgc3VtbWFyeTogJ0NoYW5nZSBkaXJlY3RvcnkgKGluc2lkZSBob21lKScgfSxcbiAgeyBuYW1lOiAnbWtkaXInLCBncm91cDogJ0ZpbGVzJywgdXNhZ2U6ICdta2RpciA8ZGlyPicsIHN1bW1hcnk6ICdDcmVhdGUgYSBkaXJlY3RvcnknIH0sXG4gIHsgbmFtZTogJ3JtJywgYWxpYXNlczogWydyZW1vdmUnXSwgZ3JvdXA6ICdGaWxlcycsIHVzYWdlOiAncm0gWy1yXSA8cGF0aD4nLCBzdW1tYXJ5OiAnUmVtb3ZlIGEgZmlsZSBvciBkaXJlY3RvcnknIH0sXG4gIHsgbmFtZTogJ212JywgYWxpYXNlczogWydyZW5hbWUnXSwgZ3JvdXA6ICdGaWxlcycsIHVzYWdlOiAnbXYgPHNyYz4gPGRzdD4nLCBzdW1tYXJ5OiAnUmVuYW1lIG9yIG1vdmUnIH0sXG5cbiAgLy8gVXNlcnNcbiAgeyBuYW1lOiAnbGlzdCcsIGFsaWFzZXM6IFsndXNlcnMnXSwgZ3JvdXA6ICdVc2VycycsIHVzYWdlOiAnbGlzdCcsIHN1bW1hcnk6ICdMaXN0IEZUUCBhY2NvdW50cycgfSxcbiAge1xuICAgIG5hbWU6ICdhZGQnLFxuICAgIGFsaWFzZXM6IFsndXNlcmFkZCddLFxuICAgIGdyb3VwOiAnVXNlcnMnLFxuICAgIHVzYWdlOiAnYWRkIC0tdXNlcm5hbWUgPG5hbWU+IC0tcGFzc3dvcmQgPHBhc3M+IFstLWhvbWUgPGRpcj5dIFstLXBlcm0gPHJ3eHIteHIteD5dJyxcbiAgICBzdW1tYXJ5OiAnQWRkIGFuIGFjY291bnQgKHByb21wdHMgd2hlbiBubyBmbGFncyBhcmUgZ2l2ZW4pJyxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdkZWwnLFxuICAgIGFsaWFzZXM6IFsndXNlcmRlbCddLFxuICAgIGdyb3VwOiAnVXNlcnMnLFxuICAgIHVzYWdlOiAnZGVsIC0tdXNlcm5hbWUgPG5hbWU+JyxcbiAgICBzdW1tYXJ5OiAnRGVsZXRlIGFuIGFjY291bnQgKHByb21wdHMgd2hlbiAtLXVzZXJuYW1lIGlzIG9taXR0ZWQpJyxcbiAgfSxcbiAge1xuICAgIG5hbWU6ICd1cGRhdGUnLFxuICAgIGdyb3VwOiAnVXNlcnMnLFxuICAgIHVzYWdlOlxuICAgICAgJ3VwZGF0ZSAtLXVzZXJuYW1lIDxuYW1lPiBbLS1wYXNzd29yZCA8cGFzcz5dIFstLWhvbWUgPGRpcj5dIFstLW5ldy11c2VybmFtZSA8bmFtZT5dIFstLXBlcm0gPHJ3eHIteHIteD5dIFstLWVuYWJsZXwtLWRpc2FibGVdJyxcbiAgICBzdW1tYXJ5OiAnVXBkYXRlIGFuIGFjY291bnQgKHByb21wdHMgd2hlbiBubyBmbGFncyBhcmUgZ2l2ZW4pJyxcbiAgfSxcblxuICAvLyBDb25maWdcbiAgeyBuYW1lOiAnY29uZmlnJywgYWxpYXNlczogWydzZXR0aW5ncyddLCBncm91cDogJ0NvbmZpZycsIHVzYWdlOiAnY29uZmlnIFtzaG93fGdldHxzZXR8dW5zZXR8cGF0aF0nLCBzdW1tYXJ5OiAnU2VydmVyIHNldHRpbmdzIChTUUxpdGUpJyB9LFxuXTtcblxuZXhwb3J0IGNvbnN0IEdST1VQUzogc3RyaW5nW10gPSBbLi4ubmV3IFNldChDT01NQU5EUy5tYXAoKGNvbW1hbmQpID0+IGNvbW1hbmQuZ3JvdXApKV07XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQ29tbWFuZChuYW1lOiBzdHJpbmcpOiBDbGlDb21tYW5kIHwgbnVsbCB7XG4gIGNvbnN0IG5lZWRsZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIChcbiAgICBDT01NQU5EUy5maW5kKChjb21tYW5kKSA9PiBjb21tYW5kLm5hbWUgPT09IG5lZWRsZSB8fCAoY29tbWFuZC5hbGlhc2VzID8/IFtdKS5pbmNsdWRlcyhuZWVkbGUpKSA/PyBudWxsXG4gICk7XG59XG5cbi8qKiBUYWIgdGFtYW1sYW1hIHZlIGBoZWxwYCBpw6dpbiBiaWxpbmVuIHTDvG0ga29tdXQgYWRsYXLEsS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21tYW5kTmFtZXMoKTogc3RyaW5nW10ge1xuICByZXR1cm4gQ09NTUFORFMuZmxhdE1hcCgoY29tbWFuZCkgPT4gW2NvbW1hbmQubmFtZSwgLi4uKGNvbW1hbmQuYWxpYXNlcyA/PyBbXSldKTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgWUFSRElNQ0lMQVJcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxudHlwZSBIYW5kbGVyID0gKGFyZ3M6IHN0cmluZ1tdLCBjdHg6IEZ0cENsaUNvbnRleHQpID0+IEZ0cENvbW1hbmRSZXN1bHQgfCBQcm9taXNlPEZ0cENvbW1hbmRSZXN1bHQ+O1xuXG5mdW5jdGlvbiBvayhtZXNzYWdlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7Z3JlZW4oJ+KckycpfSAke21lc3NhZ2V9YDtcbn1cblxuZnVuY3Rpb24gZXJyKG1lc3NhZ2U6IHN0cmluZyk6IEZ0cENvbW1hbmRSZXN1bHQge1xuICByZXR1cm4geyBsaW5lczogW2Ake3JlZCgn4pyXJyl9ICR7bWVzc2FnZX1gXSB9O1xufVxuXG5mdW5jdGlvbiBoaW50KG1lc3NhZ2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgICAke2ZhaW50KG1lc3NhZ2UpfWA7XG59XG5cbi8qKiBgaGVscCB1c2VyYCAvIGBzZXQgcG9ydCAyMWAgZ2liaSBrdWxsYW7EsW0gaXB1w6dsYXLEsS4gKi9cbmZ1bmN0aW9uIHVzYWdlKGNtZE5hbWU6IHN0cmluZyk6IEZ0cENvbW1hbmRSZXN1bHQge1xuICBjb25zdCBjb21tYW5kID0gZmluZENvbW1hbmQoY21kTmFtZSk7XG4gIHJldHVybiBlcnIoYHVzYWdlOiAke2NvbW1hbmQgPyBjb21tYW5kLnVzYWdlIDogY21kTmFtZX1gKTtcbn1cblxuLyoqIFF1b3RlLWF3YXJlIHRva2VuaXphdGlvbjogYHVzZXIgYWRkIGJvYiBcIm15IHBhc3NcImAgLT4gNCB0b2tlbi4gKi9cbmZ1bmN0aW9uIHRva2VuaXplKGxpbmU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgdG9rZW5zOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgY3VycmVudCA9ICcnO1xuICBsZXQgcXVvdGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBsZXQgc3RhcnRlZCA9IGZhbHNlO1xuXG4gIGZvciAoY29uc3QgY2hhciBvZiBsaW5lKSB7XG4gICAgaWYgKHF1b3RlICE9PSBudWxsKSB7XG4gICAgICBpZiAoY2hhciA9PT0gcXVvdGUpIHF1b3RlID0gbnVsbDtcbiAgICAgIGVsc2UgY3VycmVudCArPSBjaGFyO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChjaGFyID09PSAnXCInIHx8IGNoYXIgPT09IFwiJ1wiKSB7XG4gICAgICBxdW90ZSA9IGNoYXI7XG4gICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoY2hhciA9PT0gJyAnIHx8IGNoYXIgPT09ICdcXHQnKSB7XG4gICAgICBpZiAoc3RhcnRlZCB8fCBjdXJyZW50ICE9PSAnJykge1xuICAgICAgICB0b2tlbnMucHVzaChjdXJyZW50KTtcbiAgICAgICAgY3VycmVudCA9ICcnO1xuICAgICAgICBzdGFydGVkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY3VycmVudCArPSBjaGFyO1xuICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICB9XG4gIGlmIChxdW90ZSAhPT0gbnVsbCAmJiBjdXJyZW50ICE9PSAnJykgdG9rZW5zLnB1c2goY3VycmVudCk7XG4gIGlmIChzdGFydGVkIHx8IGN1cnJlbnQgIT09ICcnKSB0b2tlbnMucHVzaChjdXJyZW50KTtcbiAgcmV0dXJuIHRva2Vucztcbn1cblxuZnVuY3Rpb24gc2Vzc2lvblVzZXIoY3R4OiBGdHBDbGlDb250ZXh0KTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiBjdHgudXNlcjtcbn1cblxuZnVuY3Rpb24gcGVybWlzc2lvblN0cmluZyhjdHg6IEZ0cENsaUNvbnRleHQsIHVzZXJuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBkYiA9IGN0eC5zZXJ2ZXIuZ2V0RGIoKTtcbiAgY29uc3QgdXNlciA9IGN0eC5zZXJ2ZXIuZ2V0VXNlck1hbmFnZXIoKT8uZmluZFVzZXIodXNlcm5hbWUsIHRydWUpO1xuICByZXR1cm4gZGIudG9MaW51eFN0cmluZyh1c2VyPy5wZXJtaXNzaW9ucyk7XG59XG5cbmZ1bmN0aW9uIG5lZWRMb2dpbihjdHg6IEZ0cENsaUNvbnRleHQpOiBGdHBDb21tYW5kUmVzdWx0IHwgbnVsbCB7XG4gIGlmIChzZXNzaW9uVXNlcihjdHgpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHtcbiAgICBsaW5lczogW1xuICAgICAgYCR7eWVsbG93KCchJyl9IG5vIHNlc3Npb24gYWNjb3VudGAsXG4gICAgICBoaW50KGBhZGQgb25lIGZpcnN0OiBhZGQgLS11c2VybmFtZSA8bmFtZT4gLS1wYXNzd29yZCA8cGFzcz5gKSxcbiAgICBdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBuZWVkUGVybWlzc2lvbihjdHg6IEZ0cENsaUNvbnRleHQsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBGdHBDb21tYW5kUmVzdWx0IHwgbnVsbCB7XG4gIGNvbnN0IHVzZXIgPSBzZXNzaW9uVXNlcihjdHgpO1xuICBpZiAoIXVzZXIpIHJldHVybiBuZWVkTG9naW4oY3R4KTtcbiAgY29uc3QgdXNlck1hbmFnZXIgPSBjdHguc2VydmVyLmdldFVzZXJNYW5hZ2VyKCk7XG4gIGlmICghdXNlck1hbmFnZXIpIHJldHVybiBlcnIoJ3VzZXIgbWFuYWdlciBub3QgaW5pdGlhbGl6ZWQnKTtcbiAgaWYgKHVzZXJNYW5hZ2VyLmNoZWNrUGVybWlzc2lvbih1c2VyLCBwZXJtaXNzaW9uKSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7XG4gICAgbGluZXM6IFtcbiAgICAgIGAke3JlZCgn4pyXJyl9IHBlcm1pc3Npb24gZGVuaWVkOiAke3Blcm1pc3Npb259ICR7ZmFpbnQoYCgke3VzZXJ9ICR7cGVybWlzc2lvblN0cmluZyhjdHgsIHVzZXIpfSlgKX1gLFxuICAgICAgaGludChgZ3JhbnQgaXQgd2l0aDogdXBkYXRlIC0tdXNlcm5hbWUgJHt1c2VyfSAtLXBlcm0gcnd4ci14ci14YCksXG4gICAgXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVRhcmdldChjdHg6IEZ0cENsaUNvbnRleHQsIHJhdzogc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjayA9ICcuJyk6IHN0cmluZyB7XG4gIGNvbnN0IGJhc2UgPSBjdHguY3VycmVudERpciB8fCBjdHguaG9tZURpciB8fCBwcm9jZXNzLmN3ZCgpO1xuICByZXR1cm4gcGF0aC5yZXNvbHZlKGJhc2UsIHJhdyAmJiByYXcudHJpbSgpICE9PSAnJyA/IHJhdyA6IGZhbGxiYWNrKTtcbn1cblxuLyoqIEZUUCBrw7ZrIChob21lKSBkxLHFn8SxbmEgw6fEsWttYXnEsSBlbmdlbGxlIOKAlCBzaGVsbCBkZSB0xLFwa8SxIGlzdGVtY2kgZ2liaSBjaHJvb3QnbHUuICovXG5mdW5jdGlvbiBpbnNpZGVIb21lKGN0eDogRnRwQ2xpQ29udGV4dCwgdGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgaG9tZSA9IHBhdGgucmVzb2x2ZShjdHguaG9tZURpciB8fCBwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3QgcmVsID0gcGF0aC5yZWxhdGl2ZShob21lLCB0YXJnZXQpO1xuICByZXR1cm4gcmVsID09PSAnJyB8fCAoIXJlbC5zdGFydHNXaXRoKCcuLicpICYmICFwYXRoLmlzQWJzb2x1dGUocmVsKSk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFNpemUoYnl0ZXM6IG51bWJlcik6IHN0cmluZyB7XG4gIGlmIChieXRlcyA8IDEwMjQpIHJldHVybiBgJHtieXRlc31gO1xuICBjb25zdCB1bml0cyA9IFsnSycsICdNJywgJ0cnLCAnVCddO1xuICBsZXQgdmFsdWUgPSBieXRlcyAvIDEwMjQ7XG4gIGxldCBpbmRleCA9IDA7XG4gIHdoaWxlICh2YWx1ZSA+PSAxMDI0ICYmIGluZGV4IDwgdW5pdHMubGVuZ3RoIC0gMSkge1xuICAgIHZhbHVlIC89IDEwMjQ7XG4gICAgaW5kZXggKz0gMTtcbiAgfVxuICByZXR1cm4gYCR7dmFsdWUudG9GaXhlZCgxKX0ke3VuaXRzW2luZGV4XX1gO1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZVRvKGN0eDogRnRwQ2xpQ29udGV4dCwgdGFyZ2V0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBiYXNlID0gcGF0aC5yZXNvbHZlKGN0eC5jdXJyZW50RGlyIHx8IGN0eC5ob21lRGlyIHx8IHByb2Nlc3MuY3dkKCkpO1xuICBjb25zdCByZWwgPSBwYXRoLnJlbGF0aXZlKGJhc2UsIHRhcmdldCk7XG4gIHJldHVybiByZWwgPT09ICcnID8gJy4nIDogcmVsLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJyk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIERPU1lBIEtPTVVUTEFSSVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5jb25zdCBsczogSGFuZGxlciA9IChhcmdzLCBjdHgpID0+IHtcbiAgY29uc3QgZGVuaWVkID0gbmVlZFBlcm1pc3Npb24oY3R4LCAnbGlzdCcpO1xuICBpZiAoZGVuaWVkKSByZXR1cm4gZGVuaWVkO1xuXG4gIGNvbnN0IHRhcmdldCA9IHJlc29sdmVUYXJnZXQoY3R4LCBhcmdzWzBdKTtcbiAgaWYgKCFpbnNpZGVIb21lKGN0eCwgdGFyZ2V0KSkgcmV0dXJuIGVycihgb3V0c2lkZSBob21lOiAke3JlbGF0aXZlVG8oY3R4LCB0YXJnZXQpfWApO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkgcmV0dXJuIGVycihgbm8gc3VjaCBwYXRoOiAke3JlbGF0aXZlVG8oY3R4LCB0YXJnZXQpfWApO1xuXG4gIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyh0YXJnZXQpO1xuICBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgIHJldHVybiB7IGxpbmVzOiBbYC0gJHtmb3JtYXRTaXplKHN0YXQuc2l6ZSkucGFkU3RhcnQoOSl9ICAke3BhdGguYmFzZW5hbWUodGFyZ2V0KX1gXSB9O1xuICB9XG5cbiAgY29uc3QgZW50cmllcyA9IGZzXG4gICAgLnJlYWRkaXJTeW5jKHRhcmdldCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pXG4gICAgLnNvcnQoKGEsIGIpID0+IE51bWJlcihiLmlzRGlyZWN0b3J5KCkpIC0gTnVtYmVyKGEuaXNEaXJlY3RvcnkoKSkgfHwgYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG5cbiAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSByZXR1cm4geyBsaW5lczogW2Ake2N5YW4ocmVsYXRpdmVUbyhjdHgsIHRhcmdldCkpfSAke2ZhaW50KCcoZW1wdHkpJyl9YF0gfTtcblxuICBjb25zdCByb3dzID0gZW50cmllcy5tYXAoKGVudHJ5KSA9PiB7XG4gICAgY29uc3QgZnVsbCA9IHBhdGguam9pbih0YXJnZXQsIGVudHJ5Lm5hbWUpO1xuICAgIGNvbnN0IHNpemUgPSBlbnRyeS5pc0ZpbGUoKSA/IGZzLnN0YXRTeW5jKGZ1bGwpLnNpemUgOiAwO1xuICAgIGNvbnN0IHR5cGUgPSBlbnRyeS5pc0RpcmVjdG9yeSgpID8gJ2QnIDogJy0nO1xuICAgIGNvbnN0IG5hbWUgPSBlbnRyeS5pc0RpcmVjdG9yeSgpID8gYCR7Y3lhbihlbnRyeS5uYW1lKX0vYCA6IGVudHJ5Lm5hbWU7XG4gICAgcmV0dXJuIGAke2JvbGQodHlwZS5wYWRFbmQoNCkpfSAke2Zvcm1hdFNpemUoc2l6ZSkucGFkU3RhcnQoOSl9ICAke25hbWV9YDtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBsaW5lczogW1xuICAgICAgYCR7Ym9sZCgnVFlQRScucGFkRW5kKDQpKX0gJHtib2xkKCdTSVpFJy5wYWRTdGFydCg5KSl9ICAke2JvbGQoJ05BTUUnKX1gLFxuICAgICAgZmFpbnQoYCR7J+KUgCcucmVwZWF0KDQpfSAkeyfilIAnLnJlcGVhdCg5KX0gICR7J+KUgCcucmVwZWF0KDIwKX1gKSxcbiAgICAgIC4uLnJvd3MsXG4gICAgXSxcbiAgfTtcbn07XG5cbmNvbnN0IHB3ZDogSGFuZGxlciA9IChfYXJncywgY3R4KSA9PiB7XG4gIHJldHVybiB7IGxpbmVzOiBbY3lhbihjdHguY3VycmVudERpciB8fCBjdHguaG9tZURpciB8fCBwcm9jZXNzLmN3ZCgpKV0gfTtcbn07XG5cbmNvbnN0IGNkOiBIYW5kbGVyID0gKGFyZ3MsIGN0eCkgPT4ge1xuICBjb25zdCBkZW5pZWQgPSBuZWVkUGVybWlzc2lvbihjdHgsICdsaXN0Jyk7XG4gIGlmIChkZW5pZWQpIHJldHVybiBkZW5pZWQ7XG4gIGlmICghYXJnc1swXSkgcmV0dXJuIHVzYWdlKCdjZCcpO1xuXG4gIGNvbnN0IHRhcmdldCA9IHJlc29sdmVUYXJnZXQoY3R4LCBhcmdzWzBdKTtcbiAgaWYgKCFpbnNpZGVIb21lKGN0eCwgdGFyZ2V0KSkgcmV0dXJuIGVycignb3V0c2lkZSBob21lIGRpcmVjdG9yeScpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkgcmV0dXJuIGVycihgbm8gc3VjaCBkaXJlY3Rvcnk6ICR7cmVsYXRpdmVUbyhjdHgsIHRhcmdldCl9YCk7XG4gIGlmICghZnMuc3RhdFN5bmModGFyZ2V0KS5pc0RpcmVjdG9yeSgpKSByZXR1cm4gZXJyKGBub3QgYSBkaXJlY3Rvcnk6ICR7cmVsYXRpdmVUbyhjdHgsIHRhcmdldCl9YCk7XG5cbiAgY3R4LmN1cnJlbnREaXIgPSB0YXJnZXQ7XG4gIHJldHVybiB7IGxpbmVzOiBbYCR7Y3lhbihyZWxhdGl2ZVRvKGN0eCwgdGFyZ2V0KSl9YF0gfTtcbn07XG5cbmNvbnN0IG1rZGlyOiBIYW5kbGVyID0gKGFyZ3MsIGN0eCkgPT4ge1xuICBjb25zdCBkZW5pZWQgPSBuZWVkUGVybWlzc2lvbihjdHgsICdta2QnKTtcbiAgaWYgKGRlbmllZCkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFhcmdzWzBdKSByZXR1cm4gdXNhZ2UoJ21rZGlyJyk7XG5cbiAgY29uc3QgdGFyZ2V0ID0gcmVzb2x2ZVRhcmdldChjdHgsIGFyZ3NbMF0pO1xuICBpZiAoIWluc2lkZUhvbWUoY3R4LCB0YXJnZXQpKSByZXR1cm4gZXJyKCdvdXRzaWRlIGhvbWUgZGlyZWN0b3J5Jyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpIHJldHVybiBlcnIoYGFscmVhZHkgZXhpc3RzOiAke3JlbGF0aXZlVG8oY3R4LCB0YXJnZXQpfWApO1xuXG4gIGZzLm1rZGlyU3luYyh0YXJnZXQsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICByZXR1cm4geyBsaW5lczogW29rKGBjcmVhdGVkICR7cmVsYXRpdmVUbyhjdHgsIHRhcmdldCl9L2ApXSB9O1xufTtcblxuY29uc3Qgcm06IEhhbmRsZXIgPSAoYXJncywgY3R4KSA9PiB7XG4gIGlmICghYXJnc1swXSkgcmV0dXJuIHVzYWdlKCdybScpO1xuXG4gIGNvbnN0IGZsYWdzID0gYXJncy5maWx0ZXIoKGFyZykgPT4gYXJnLnN0YXJ0c1dpdGgoJy0nKSk7XG4gIGNvbnN0IG5hbWVzID0gYXJncy5maWx0ZXIoKGFyZykgPT4gIWFyZy5zdGFydHNXaXRoKCctJykpO1xuICBpZiAobmFtZXMubGVuZ3RoID09PSAwKSByZXR1cm4gdXNhZ2UoJ3JtJyk7XG4gIGNvbnN0IHJlY3Vyc2l2ZSA9IGZsYWdzLnNvbWUoKGZsYWcpID0+IGZsYWcuaW5jbHVkZXMoJ3InKSk7XG5cbiAgY29uc3QgdGFyZ2V0ID0gcmVzb2x2ZVRhcmdldChjdHgsIG5hbWVzWzBdKTtcbiAgaWYgKCFpbnNpZGVIb21lKGN0eCwgdGFyZ2V0KSkgcmV0dXJuIGVycignb3V0c2lkZSBob21lIGRpcmVjdG9yeScpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkgcmV0dXJuIGVycihgbm8gc3VjaCBwYXRoOiAke3JlbGF0aXZlVG8oY3R4LCB0YXJnZXQpfWApO1xuXG4gIGNvbnN0IGlzRGlyZWN0b3J5ID0gZnMuc3RhdFN5bmModGFyZ2V0KS5pc0RpcmVjdG9yeSgpO1xuICBjb25zdCBkZW5pZWQgPSBuZWVkUGVybWlzc2lvbihjdHgsIGlzRGlyZWN0b3J5ID8gJ3JtZGlyJyA6ICdkZWxldGUnKTtcbiAgaWYgKGRlbmllZCkgcmV0dXJuIGRlbmllZDtcblxuICBpZiAoaXNEaXJlY3RvcnkgJiYgIXJlY3Vyc2l2ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBsaW5lczogW1xuICAgICAgICBgJHtyZWQoJ+KclycpfSAke3JlbGF0aXZlVG8oY3R4LCB0YXJnZXQpfSBpcyBhIGRpcmVjdG9yeWAsXG4gICAgICAgIGhpbnQoYHVzZTogcm0gLXIgJHtyZWxhdGl2ZVRvKGN0eCwgdGFyZ2V0KX1gKSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIGlmIChpc0RpcmVjdG9yeSkgZnMucm1TeW5jKHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiBmYWxzZSB9KTtcbiAgZWxzZSBmcy51bmxpbmtTeW5jKHRhcmdldCk7XG5cbiAgcmV0dXJuIHsgbGluZXM6IFtvayhgcmVtb3ZlZCAke3JlbGF0aXZlVG8oY3R4LCB0YXJnZXQpfWApXSB9O1xufTtcblxuY29uc3QgbXY6IEhhbmRsZXIgPSAoYXJncywgY3R4KSA9PiB7XG4gIGNvbnN0IGRlbmllZCA9IG5lZWRQZXJtaXNzaW9uKGN0eCwgJ3JlbmFtZScpO1xuICBpZiAoZGVuaWVkKSByZXR1cm4gZGVuaWVkO1xuICBpZiAoYXJncy5sZW5ndGggPCAyKSByZXR1cm4gdXNhZ2UoJ212Jyk7XG5cbiAgY29uc3QgZnJvbSA9IHJlc29sdmVUYXJnZXQoY3R4LCBhcmdzWzBdKTtcbiAgY29uc3QgdG8gPSByZXNvbHZlVGFyZ2V0KGN0eCwgYXJnc1sxXSk7XG4gIGlmICghaW5zaWRlSG9tZShjdHgsIGZyb20pIHx8ICFpbnNpZGVIb21lKGN0eCwgdG8pKSByZXR1cm4gZXJyKCdvdXRzaWRlIGhvbWUgZGlyZWN0b3J5Jyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhmcm9tKSkgcmV0dXJuIGVycihgbm8gc3VjaCBwYXRoOiAke3JlbGF0aXZlVG8oY3R4LCBmcm9tKX1gKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModG8pKSByZXR1cm4gZXJyKGBhbHJlYWR5IGV4aXN0czogJHtyZWxhdGl2ZVRvKGN0eCwgdG8pfWApO1xuXG4gIGZzLnJlbmFtZVN5bmMoZnJvbSwgdG8pO1xuICByZXR1cm4geyBsaW5lczogW29rKGAke3JlbGF0aXZlVG8oY3R4LCBmcm9tKX0gLT4gJHtyZWxhdGl2ZVRvKGN0eCwgdG8pfWApXSB9O1xufTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgS1VMTEFOSUNJIEtPTVVUTEFSSVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5jb25zdCBMSU5VWF9QRVJNID0gL15bcnd4LV17OX0kLztcblxuLyoqIDkgcGVybWlzc2lvbiBiaXRpIGnDp2luIGt1bGxhbsSxY8SxZGFuIGNldmFwIGFsxLFwIExpbnV4IHBlcm0gc3RyaW5nJ2kgZMO2bmVyLiAqL1xuYXN5bmMgZnVuY3Rpb24gcHJvbXB0UGVybWlzc2lvbnMoY3R4OiBGdHBDbGlDb250ZXh0KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgLy8gOSBwZXJtaXNzaW9uIGJpdGk6IG93bmVyKHJlYWQvd3JpdGUvZXhlY3V0ZSksIGdyb3VwKHJlYWQvd3JpdGUvZXhlY3V0ZSksIG90aGVycyhyZWFkL3dyaXRlL2V4ZWN1dGUpXG4gIGNvbnN0IGJpdHM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgbGFiZWxzID0gW1xuICAgICdPd25lciBSZWFkJyxcbiAgICAnT3duZXIgV3JpdGUnLFxuICAgICdPd25lciBFeGVjdXRlJyxcbiAgICAnR3JvdXAgUmVhZCcsXG4gICAgJ0dyb3VwIFdyaXRlJyxcbiAgICAnR3JvdXAgRXhlY3V0ZScsXG4gICAgJ090aGVycyBSZWFkJyxcbiAgICAnT3RoZXJzIFdyaXRlJyxcbiAgICAnT3RoZXJzIEV4ZWN1dGUnLFxuICBdO1xuXG4gIC8vIEhlciBpemluIGnDp2luIHkvbiBzb3JcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA5OyBpICs9IDEpIHtcbiAgICBjb25zdCBsYWJlbCA9IGxhYmVsc1tpXTtcbiAgICBjb25zdCB5biA9IChhd2FpdCBhc2soYCAgJHtsYWJlbH0gW3kvbl06IGApKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBiaXRzW2ldID0geW4gPT09ICd5JyB8fCB5biA9PT0gJ3llcycgPyAoaSAlIDMgPT09IDAgPyAncicgOiBpICUgMyA9PT0gMSA/ICd3JyA6ICd4JykgOiAnLSc7XG4gIH1cblxuICBjb25zdCByZXN1bHQgPSBiaXRzLmpvaW4oJycpO1xuICBpZiAoIUxJTlVYX1BFUk0udGVzdChyZXN1bHQpKSB7XG4gICAgLy8gRmFsbGJhY2s6IHJ3eHIteHIteFxuICAgIHJldHVybiAncnd4ci14ci14JztcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5pbnRlcmZhY2UgUGFyc2VkRmxhZ3Mge1xuICB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGZsYWdzOiBTZXQ8c3RyaW5nPjtcbiAgcG9zaXRpb25hbDogc3RyaW5nW107XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG4vKiogVGVybWluYWwgYXJnw7xtYW5sYXLEsW7EsSBgLS1rZXkgdmFsdWVgIC8gYC0tZmxhZ2AgYmnDp2ltaW5kZSBheXLEscWfdMSxcsSxci4gKi9cbmZ1bmN0aW9uIHBhcnNlRmxhZ3MoXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBzcGVjOiB7IHZhbHVlcz86IHN0cmluZ1tdOyBib29scz86IHN0cmluZ1tdIH0sXG4pOiBQYXJzZWRGbGFncyB7XG4gIGNvbnN0IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICBjb25zdCBmbGFncyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwb3NpdGlvbmFsOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCB2YWx1ZUtleXMgPSBzcGVjLnZhbHVlcyA/PyBbXTtcbiAgY29uc3QgYm9vbEtleXMgPSBzcGVjLmJvb2xzID8/IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IGFyZyA9IGFyZ3NbaV07XG4gICAgaWYgKCFhcmcuc3RhcnRzV2l0aCgnLS0nKSkge1xuICAgICAgcG9zaXRpb25hbC5wdXNoKGFyZyk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBrZXkgPSBhcmcuc2xpY2UoMik7XG4gICAgaWYgKGJvb2xLZXlzLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgIGZsYWdzLmFkZChrZXkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmICh2YWx1ZUtleXMuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgY29uc3QgdmFsdWUgPSBhcmdzW2kgKyAxXTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgICAgcmV0dXJuIHsgdmFsdWVzLCBmbGFncywgcG9zaXRpb25hbCwgZXJyb3I6IGBtaXNzaW5nIHZhbHVlIGZvciAtLSR7a2V5fWAgfTtcbiAgICAgIH1cbiAgICAgIHZhbHVlc1trZXldID0gdmFsdWU7XG4gICAgICBpICs9IDE7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcmV0dXJuIHsgdmFsdWVzLCBmbGFncywgcG9zaXRpb25hbCwgZXJyb3I6IGB1bmtub3duIG9wdGlvbjogJHthcmd9YCB9O1xuICB9XG5cbiAgcmV0dXJuIHsgdmFsdWVzLCBmbGFncywgcG9zaXRpb25hbCB9O1xufVxuXG4vKiogUGxhdGZvcm1kYW4gYmHEn8SxbXPEsXogeW9sIG5vcm1hbGl6YXN5b251LlxuICogIFdpbmRvd3MgKFxcXFwpIHZlIExpbnV4ICgvKSBiacOnaW1sZXJpbmkgZGVzdGVrbGVyLCByZXN1bHQndSBub3JtYWxpemUgZWRlci4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBhdGgocDogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy8gQm/Fn3NhIHZhcnNhecSxbGFuIGTDtm5cbiAgaWYgKCFwKSByZXR1cm4gJy4nO1xuICAvLyBXaW5kb3dzIHPDvHLDvGPDvCBoYXJmaSB2ZSB5b2xsYXLEsSAoQzpcXCB2ZXlhIEM6LylcbiAgaWYgKHAubWF0Y2goL15bQS1aYS16XTooXFxcXFxcXFxcXC98JCkvKSkge1xuICAgIHJldHVybiBwYXRoLndpbjMyLm5vcm1hbGl6ZShwLnJlcGxhY2UoL1xcLy9nLCAnXFxcXFxcXFwnKSk7XG4gIH1cbiAgLy8gTGludXggeW9sbGFyxLEgKC9ob21lLCAuLywgLi4vKVxuICBpZiAocC5zdGFydHNXaXRoKCcvJykgfHwgcC5zdGFydHNXaXRoKCcuLycpIHx8IHAuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICByZXR1cm4gcGF0aC5wb3NpeC5ub3JtYWxpemUocCk7XG4gIH1cbiAgLy8gxLBzaW1saS95b2wga8Sxc23EsSB5b2ssIHdpbjMyIG5vcm1hbGl6ZSBkZW5lXG4gIHJldHVybiBwYXRoLndpbjMyLm5vcm1hbGl6ZShwKTtcbn1cblxuZnVuY3Rpb24gdXNlclJvd3MoY3R4OiBGdHBDbGlDb250ZXh0KTogc3RyaW5nW10ge1xuICBjb25zdCB1c2VycyA9IGN0eC5zZXJ2ZXIuZ2V0VXNlck1hbmFnZXIoKT8ubGlzdFVzZXJzKHRydWUpID8/IFtdO1xuICBjb25zdCBkYiA9IGN0eC5zZXJ2ZXIuZ2V0RGIoKTtcbiAgY29uc3Qgcm93cyA9IHVzZXJzLm1hcCgodXNlcikgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSB1c2VyLnVzZXJuYW1lLnBhZEVuZCgxNik7XG4gICAgY29uc3Qgc3RhdHVzID0gKHVzZXIuaXNBY3RpdmUgPyAnYWN0aXZlJyA6ICdkaXNhYmxlZCcpLnBhZEVuZCgxMCk7XG4gICAgcmV0dXJuIGAke3VzZXIuaXNBY3RpdmUgPyBjeWFuKG5hbWUpIDogeWVsbG93KG5hbWUpfSAgJHt1c2VyLmlzQWN0aXZlID8gZ3JlZW4oc3RhdHVzKSA6IHllbGxvdyhzdGF0dXMpfSAgJHtib2xkKGRiLnRvTGludXhTdHJpbmcodXNlci5wZXJtaXNzaW9ucykpfSAgJHtkaW0odXNlci5ob21lRGlyKX1gO1xuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgJHtib2xkKCdVU0VSJy5wYWRFbmQoMTYpKX0gICR7Ym9sZCgnU1RBVFVTJy5wYWRFbmQoMTApKX0gICR7Ym9sZCgnUEVSTVMnKX0gICR7Ym9sZCgnSE9NRScpfWAsXG4gICAgZmFpbnQoYCR7J+KUgCcucmVwZWF0KDE2KX0gICR7J+KUgCcucmVwZWF0KDEwKX0gICR7J+KUgCcucmVwZWF0KDkpfSAgJHsn4pSAJy5yZXBlYXQoMjApfWApLFxuICAgIC4uLnJvd3MsXG4gIF07XG59XG5cbi8qKiBgbGlzdGAg4oaSIGhlc2FwIHRhYmxvc3UuICovXG5jb25zdCBsaXN0VXNlcnM6IEhhbmRsZXIgPSAoX2FyZ3MsIGN0eCkgPT4ge1xuICBjb25zdCB1c2VyTWFuYWdlciA9IGN0eC5zZXJ2ZXIuZ2V0VXNlck1hbmFnZXIoKTtcbiAgaWYgKCF1c2VyTWFuYWdlcikgcmV0dXJuIGVycigndXNlciBtYW5hZ2VyIG5vdCBpbml0aWFsaXplZCcpO1xuICByZXR1cm4geyBsaW5lczogdXNlclJvd3MoY3R4KSB9O1xufTtcblxuLyoqXG4gKiBgYWRkIC0tdXNlcm5hbWUgPG5hbWU+IC0tcGFzc3dvcmQgPHBhc3M+IFstLWhvbWUgPGRpcj5dIFstLXBlcm0gPHJ3eHIteHIteD5dYFxuICogQmF5cmFrIHZlcmlsbWV5ZW4gYWxhbmxhciBpbnRlcmFrdGlmIG9sYXJhayBzb3J1bHVyLlxuICogLS1wZXJtIHZlcmlsZGl5c2Uga3VsbGFuxLFsxLFyLCB5b2tzYSBpemluIHRhYmxvc3UgaWxlIGJpcmxpa3RlIHByb21wdCBhw6fEsWzEsXIuXG4gKi9cbmNvbnN0IGFkZFVzZXI6IEhhbmRsZXIgPSBhc3luYyAoYXJncywgY3R4KSA9PiB7XG4gIGNvbnN0IHVzZXJNYW5hZ2VyID0gY3R4LnNlcnZlci5nZXRVc2VyTWFuYWdlcigpO1xuICBpZiAoIXVzZXJNYW5hZ2VyKSByZXR1cm4gZXJyKCd1c2VyIG1hbmFnZXIgbm90IGluaXRpYWxpemVkJyk7XG4gIGNvbnN0IGRiID0gY3R4LnNlcnZlci5nZXREYigpO1xuXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRmxhZ3MoYXJncywgeyB2YWx1ZXM6IFsndXNlcm5hbWUnLCAncGFzc3dvcmQnLCAnaG9tZScsICdwZXJtJ10gfSk7XG4gIGlmIChwYXJzZWQuZXJyb3IpIHJldHVybiBlcnIocGFyc2VkLmVycm9yKTtcbiAgaWYgKHBhcnNlZC5wb3NpdGlvbmFsLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gZXJyKFxuICAgICAgYHVuZXhwZWN0ZWQgYXJndW1lbnQ6ICR7cGFyc2VkLnBvc2l0aW9uYWxbMF19ICR7ZmFpbnQoJyh1c2UgLS11c2VybmFtZSwgLS1wYXNzd29yZCwgLS1ob21lLCAtLXBlcm0pJyl9YCxcbiAgICApO1xuICB9XG5cbiAgbGV0IG5hbWUgPSBwYXJzZWQudmFsdWVzLnVzZXJuYW1lO1xuICBsZXQgcGFzc3dvcmQgPSBwYXJzZWQudmFsdWVzLnBhc3N3b3JkO1xuICBsZXQgaG9tZSA9IHBhcnNlZC52YWx1ZXMuaG9tZTtcbiAgLy8gLS1wZXJtIHZlcmlsZGl5c2UgZG/En3J1ZGFuIGt1bGxhbiwgeW9rc2EgdGFibGUgcHJvbXB0dSBhw6dcbiAgbGV0IHBlcm1zID0gcGFyc2VkLnZhbHVlcy5wZXJtO1xuXG4gIGlmIChuYW1lID09PSB1bmRlZmluZWQpIG5hbWUgPSAoYXdhaXQgYXNrKCcgIFVzZXJuYW1lOiAnKSkudHJpbSgpO1xuICBpZiAoIW5hbWUpIHJldHVybiBlcnIoJ3VzZXJuYW1lIHJlcXVpcmVkJyk7XG4gIGlmICh1c2VyTWFuYWdlci5maW5kVXNlcihuYW1lLCB0cnVlKSkgcmV0dXJuIGVycihgdXNlciBhbHJlYWR5IGV4aXN0czogJHtuYW1lfWApO1xuXG4gIGlmIChwYXNzd29yZCA9PT0gdW5kZWZpbmVkKSBwYXNzd29yZCA9IChhd2FpdCBhc2tTZWNyZXQoJyAgUGFzc3dvcmQ6ICcpKS50cmltKCk7XG4gIGlmICghcGFzc3dvcmQpIHJldHVybiBlcnIoJ3Bhc3N3b3JkIHJlcXVpcmVkJyk7XG5cbiAgaWYgKGhvbWUgPT09IHVuZGVmaW5lZCkgaG9tZSA9IG5vcm1hbGl6ZVBhdGgoKGF3YWl0IGFzaygnICBIb21lIFsuL106ICcpKS50cmltKCkpIHx8ICcuLyc7XG5cbiAgLy8gxLB6aW4gdGFibG9zdTogT3duZXIvR3JvdXAvT3RoZXJzIGnDp2luIFJlYWQvV3JpdGUvRXhlY3V0ZSBzZcOnZW5la2xlcmlcbiAgaWYgKHBlcm1zID09PSB1bmRlZmluZWQpIHBlcm1zID0gYXdhaXQgcHJvbXB0UGVybWlzc2lvbnMoY3R4KTtcblxuICBpZiAoIUxJTlVYX1BFUk0udGVzdChwZXJtcykpIHtcbiAgICByZXR1cm4gZXJyKGBiYWQgcGVybWlzc2lvbiBzdHJpbmc6ICR7cGVybXN9ICR7ZmFpbnQoJyhleHBlY3RlZCByd3hyLXhyLXgpJyl9YCk7XG4gIH1cblxuICBjb25zdCBob21lRGlyID0gcmVzb2x2ZVRhcmdldChjdHgsIGhvbWUpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoaG9tZURpcikpIGZzLm1rZGlyU3luYyhob21lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgcGVybWlzc2lvbnM6IFVzZXJQZXJtaXNzaW9ucyA9IGRiLmZyb21MaW51eFN0cmluZyhwZXJtcyk7XG5cbiAgY29uc3QgYWRkZWQgPSB1c2VyTWFuYWdlci5hZGRVc2VyKG5hbWUsIHBhc3N3b3JkLCBob21lRGlyLCBwZXJtaXNzaW9ucyk7XG4gIGlmICghYWRkZWQpIHJldHVybiBlcnIoYGNvdWxkIG5vdCBjcmVhdGUgdXNlcjogJHtuYW1lfWApO1xuICByZXR1cm4ge1xuICAgIGxpbmVzOiBbXG4gICAgICBvayhgdXNlciAke25hbWV9IGNyZWF0ZWRgKSxcbiAgICAgIGAgICR7ZGltKCdob21lICAnKX0gJHtob21lRGlyfWAsXG4gICAgICBgICAke2RpbSgncGVybXMgJyl9ICR7Ym9sZChwZXJtcyl9YCxcbiAgICBdLFxuICB9O1xufTtcblxuLyoqIGBkZWwgLS11c2VybmFtZSA8bmFtZT5gIOKGkiBoZXNhYsSxIHZlIGhvbWUgZGl6aW5pbmkgYmlybGlrdGUgc2lsZXIuICovXG5jb25zdCBkZWxldGVVc2VyOiBIYW5kbGVyID0gYXN5bmMgKGFyZ3MsIGN0eCkgPT4ge1xuICBjb25zdCB1c2VyTWFuYWdlciA9IGN0eC5zZXJ2ZXIuZ2V0VXNlck1hbmFnZXIoKTtcbiAgaWYgKCF1c2VyTWFuYWdlcikgcmV0dXJuIGVycigndXNlciBtYW5hZ2VyIG5vdCBpbml0aWFsaXplZCcpO1xuXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRmxhZ3MoYXJncywgeyB2YWx1ZXM6IFsndXNlcm5hbWUnXSB9KTtcbiAgaWYgKHBhcnNlZC5lcnJvcikgcmV0dXJuIGVycihwYXJzZWQuZXJyb3IpO1xuICBpZiAocGFyc2VkLnBvc2l0aW9uYWwubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBlcnIoYHVuZXhwZWN0ZWQgYXJndW1lbnQ6ICR7cGFyc2VkLnBvc2l0aW9uYWxbMF19ICR7ZmFpbnQoJyh1c2UgLS11c2VybmFtZSA8bmFtZT4pJyl9YCk7XG4gIH1cblxuICBsZXQgbmFtZSA9IHBhcnNlZC52YWx1ZXMudXNlcm5hbWU7XG4gIGlmIChuYW1lID09PSB1bmRlZmluZWQpIG5hbWUgPSAoYXdhaXQgYXNrKCcgIFVzZXJuYW1lOiAnKSkudHJpbSgpO1xuICBpZiAoIW5hbWUpIHJldHVybiBlcnIoJ3VzZXJuYW1lIHJlcXVpcmVkJyk7XG4gIGlmICghdXNlck1hbmFnZXIuZmluZFVzZXIobmFtZSwgdHJ1ZSkpIHJldHVybiBlcnIoYG5vIHN1Y2ggdXNlcjogJHtuYW1lfWApO1xuXG4gIC8vIEt1bGxhbsSxY8SxbsSxbiBob21lIGRpemluaW5pIGJ1bFxuICBjb25zdCBhY2NvdW50ID0gdXNlck1hbmFnZXIuZmluZFVzZXIobmFtZSwgdHJ1ZSk7XG4gIGNvbnN0IGhvbWVEaXIgPSBhY2NvdW50Py5ob21lRGlyID8/IGN0eC5ob21lRGlyO1xuXG4gIC8vIMOWbmNlIHZlcml0YWJhbsSxbmRhbi9tYW5hZ2VyJ2RhbiBzaWxcbiAgY29uc3QgcmVtb3ZlZCA9IHVzZXJNYW5hZ2VyLmRlbGV0ZVVzZXIobmFtZSk7XG4gIGlmICghcmVtb3ZlZCkgcmV0dXJuIGVycihgY291bGQgbm90IGRlbGV0ZSB1c2VyOiAke25hbWV9YCk7XG5cbiAgLy8gSG9tZSBkaXppbmluaSBkZSBzaWwgKHZhcnNhIHZlIGhvbWUgdmFyc2EpXG4gIGlmIChob21lRGlyICYmIGhvbWVEaXIgIT09ICcuJyAmJiBob21lRGlyICE9PSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGhvbWVEaXIpKSB7XG4gICAgICAgIGZzLnJtU3luYyhob21lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gU2lsbWUgaGF0YXPEsSBvbHNhIGJpbGUga3VsbGFuxLFjxLEgc2lsaW5kaSBvbGFyYWsga2FidWwgZXRcbiAgICAgIExvZ2dlci5lcnJvcihgW2RlbGV0ZVVzZXJdIEZhaWxlZCB0byByZW1vdmUgaG9tZSBkaXIgJHtob21lRGlyfTpgLCBlKTtcbiAgICB9XG4gIH1cblxuICBpZiAoY3R4LnVzZXIgPT09IG5hbWUpIGN0eC51c2VyID0gbnVsbDtcbiAgcmV0dXJuIHsgbGluZXM6IFtvayhgdXNlciAke25hbWV9IGRlbGV0ZWRgKV0gfTtcbn07XG5cbi8qKiDEsG50ZXJha3RpZiB1cGRhdGU6IGFkZCBpbGUgYXluxLEgc29ydWxhcjsgeWFsbsSxemNhIGRlxJ9pxZ9lbiBhbGFubGFyIHV5Z3VsYW7EsXIuICovXG5hc3luYyBmdW5jdGlvbiBwcm9tcHRVcGRhdGUoY3R4OiBGdHBDbGlDb250ZXh0KTogUHJvbWlzZTxGdHBDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHVzZXJNYW5hZ2VyID0gY3R4LnNlcnZlci5nZXRVc2VyTWFuYWdlcigpO1xuICBpZiAoIXVzZXJNYW5hZ2VyKSByZXR1cm4gZXJyKCd1c2VyIG1hbmFnZXIgbm90IGluaXRpYWxpemVkJyk7XG4gIGNvbnN0IGRiID0gY3R4LnNlcnZlci5nZXREYigpO1xuXG4gIGNvbnN0IG5hbWUgPSAoYXdhaXQgYXNrKCcgIFVzZXJuYW1lOiAnKSkudHJpbSgpO1xuICBpZiAoIW5hbWUpIHJldHVybiBlcnIoJ3VzZXJuYW1lIHJlcXVpcmVkJyk7XG4gIGNvbnN0IGFjY291bnQgPSB1c2VyTWFuYWdlci5maW5kVXNlcihuYW1lLCB0cnVlKTtcbiAgaWYgKCFhY2NvdW50KSByZXR1cm4gZXJyKGBubyBzdWNoIHVzZXI6ICR7bmFtZX1gKTtcblxuICBjb25zdCBwYXNzd29yZCA9IChhd2FpdCBhc2tTZWNyZXQoJyAgUGFzc3dvcmQgKEVudGVyID0ga2VlcCk6ICcpKS50cmltKCk7XG4gIGNvbnN0IGN1cnJlbnRIb21lID0gYWNjb3VudC5ob21lRGlyO1xuICBjb25zdCBob21lID0gbm9ybWFsaXplUGF0aCgoYXdhaXQgYXNrKGAgIEhvbWUgWyR7Y3VycmVudEhvbWV9XTogYCkpLnRyaW0oKSk7XG4gIGNvbnN0IGN1cnJlbnRQZXJtID0gZGIudG9MaW51eFN0cmluZyhhY2NvdW50LnBlcm1pc3Npb25zKTtcbiAgLy8gxLB6aW4gdGFibG9zdXlsYSBpbnRlcmFrdGlmIGfDvG5jZWxsZW1lXG4gIGNvbnN0IHBlcm1zID0gYXdhaXQgcHJvbXB0UGVybWlzc2lvbnMoY3R4KTtcbiAgaWYgKHBlcm1zICE9PSAnJyAmJiAhTElOVVhfUEVSTS50ZXN0KHBlcm1zKSkge1xuICAgIHJldHVybiBlcnIoYGJhZCBwZXJtaXNzaW9uIHN0cmluZzogJHtwZXJtc30gJHtmYWludCgnKGV4cGVjdGVkIHJ3eHIteHIteCknKX1gKTtcbiAgfVxuXG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChwYXNzd29yZCAhPT0gJycpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgdXNlck1hbmFnZXIuY2hhbmdlUGFzc3dvcmQobmFtZSwgcGFzc3dvcmQpXG4gICAgICAgID8gb2soYCR7bmFtZX06IHBhc3N3b3JkIHVwZGF0ZWRgKVxuICAgICAgICA6IGAke3JlZCgn4pyXJyl9ICR7bmFtZX06IHBhc3N3b3JkIGNvdWxkIG5vdCBiZSB1cGRhdGVkYCxcbiAgICApO1xuICB9XG4gIGlmIChob21lICE9PSAnJykge1xuICAgIGNvbnN0IGhvbWVEaXIgPSByZXNvbHZlVGFyZ2V0KGN0eCwgaG9tZSk7XG4gICAgaWYgKHBhdGgucmVzb2x2ZShob21lRGlyKSAhPT0gcGF0aC5yZXNvbHZlKGN1cnJlbnRIb21lKSkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGhvbWVEaXIpKSBmcy5ta2RpclN5bmMoaG9tZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICBsaW5lcy5wdXNoKFxuICAgICAgICB1c2VyTWFuYWdlci5jaGFuZ2VIb21lRGlyKG5hbWUsIGhvbWVEaXIpXG4gICAgICAgICAgPyBvayhgJHtuYW1lfTogaG9tZSAtPiAke2hvbWVEaXJ9YClcbiAgICAgICAgICA6IGAke3JlZCgn4pyXJyl9ICR7bmFtZX06IGhvbWUgY291bGQgbm90IGJlIHVwZGF0ZWRgLFxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgaWYgKHBlcm1zICE9PSAnJyAmJiBwZXJtcyAhPT0gY3VycmVudFBlcm0pIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgdXNlck1hbmFnZXIudXBkYXRlUGVybWlzc2lvbnMobmFtZSwgZGIuZnJvbUxpbnV4U3RyaW5nKHBlcm1zKSlcbiAgICAgICAgPyBvayhgJHtuYW1lfTogcGVybSAtPiAke3Blcm1zfWApXG4gICAgICAgIDogYCR7cmVkKCfinJcnKX0gJHtuYW1lfTogcGVybWlzc2lvbnMgY291bGQgbm90IGJlIHVwZGF0ZWRgLFxuICAgICk7XG4gIH1cblxuICAvLyBTdGF0dXMgW2FjdGl2ZS9ub3RdIOKAlCBbeS9uXSDFn2VrbGluZGUgc29yXG4gIGNvbnN0IHN0YXR1c1luID0gKGF3YWl0IGFzayhgICBTdGF0dXMgWyR7YWNjb3VudC5pc0FjdGl2ZSA/ICdhY3RpdmUnIDogJ2luYWN0aXZlJ31dICh5L24pOiBgKSkudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGxldCBuZXdTdGF0dXM6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG4gIGlmIChzdGF0dXNZbiA9PT0gJ3knIHx8IHN0YXR1c1luID09PSAneWVzJykge1xuICAgIG5ld1N0YXR1cyA9IHRydWU7XG4gIH0gZWxzZSBpZiAoc3RhdHVzWW4gPT09ICduJyB8fCBzdGF0dXNZbiA9PT0gJ25vJykge1xuICAgIG5ld1N0YXR1cyA9IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIG5ld1N0YXR1cyA9IHVuZGVmaW5lZDsgLy8gYm/FnyBixLFyYWvEsWxkxLEsIGRlxJ9pxZ9tZVxuICB9XG4gIGlmIChuZXdTdGF0dXMgIT09IHVuZGVmaW5lZCAmJiBuZXdTdGF0dXMgIT09IGFjY291bnQuaXNBY3RpdmUpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgdXNlck1hbmFnZXIudG9nZ2xlVXNlclN0YXR1cyhuYW1lLCBuZXdTdGF0dXMpXG4gICAgICAgID8gb2soYCR7bmFtZX06ICR7bmV3U3RhdHVzID8gJ2VuYWJsZWQnIDogJ2Rpc2FibGVkJ31gKVxuICAgICAgICA6IGAke3JlZCgn4pyXJyl9ICR7bmFtZX06IHN0YXR1cyBjb3VsZCBub3QgYmUgdXBkYXRlZGAsXG4gICAgKTtcbiAgfVxuXG4gIGlmIChsaW5lcy5sZW5ndGggPT09IDApIGxpbmVzLnB1c2goYCR7eWVsbG93KCchJyl9IG5vdGhpbmcgY2hhbmdlZCBmb3IgJHtuYW1lfWApO1xuICByZXR1cm4geyBsaW5lcyB9O1xufVxuXG4vKipcbiAqIGB1cGRhdGVgIChhcmfDvG1hbnPEsXopIOKGkiBhZGQgaWxlIGF5bsSxIHNvcnVsYXLEsSBzb3Jhci5cbiAqIGB1cGRhdGUgLS11c2VybmFtZSA8bmFtZT4gWy0tcGFzc3dvcmQgPHBhc3M+XSBbLS1ob21lIDxkaXI+XSBbLS1uZXctdXNlcm5hbWUgPG5hbWU+XSBbLS1wZXJtIDxyd3hyLXhyLXg+XSBbLS1lbmFibGV8LS1kaXNhYmxlXWBcbiAqIMWeaWZyZSwgaG9tZSBkaXppbmksIGt1bGxhbsSxY8SxIGFkxLEsIGl6aW5sZXJpIHZlIGR1cnVtdSB0ZWsga29tdXR0YSBkw7x6ZW5sZXIuXG4gKi9cbmNvbnN0IHVwZGF0ZVVzZXI6IEhhbmRsZXIgPSAoYXJncywgY3R4KSA9PiB7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHByb21wdFVwZGF0ZShjdHgpO1xuXG4gIGNvbnN0IHVzZXJNYW5hZ2VyID0gY3R4LnNlcnZlci5nZXRVc2VyTWFuYWdlcigpO1xuICBpZiAoIXVzZXJNYW5hZ2VyKSByZXR1cm4gZXJyKCd1c2VyIG1hbmFnZXIgbm90IGluaXRpYWxpemVkJyk7XG4gIGNvbnN0IGRiID0gY3R4LnNlcnZlci5nZXREYigpO1xuXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRmxhZ3MoYXJncywge1xuICAgIHZhbHVlczogWyd1c2VybmFtZScsICduZXctdXNlcm5hbWUnLCAncGFzc3dvcmQnLCAnaG9tZScsICdwZXJtJ10sXG4gICAgYm9vbHM6IFsnZW5hYmxlJywgJ2Rpc2FibGUnXSxcbiAgfSk7XG4gIGlmIChwYXJzZWQuZXJyb3IpIHJldHVybiBlcnIocGFyc2VkLmVycm9yKTtcbiAgaWYgKHBhcnNlZC5wb3NpdGlvbmFsLmxlbmd0aCA+IDEpIHtcbiAgICByZXR1cm4gZXJyKGB1bmV4cGVjdGVkIGFyZ3VtZW50OiAke3BhcnNlZC5wb3NpdGlvbmFsWzFdfWApO1xuICB9XG5cbiAgLy8gYHVwZGF0ZSAtLXVzZXJuYW1lIDxuYW1lPiAuLi5gIHZleWEgZXNraSBiacOnaW0gYHVwZGF0ZSA8bmFtZT4gLi4uYFxuICBjb25zdCBuYW1lID0gcGFyc2VkLnBvc2l0aW9uYWxbMF0gPz8gcGFyc2VkLnZhbHVlcy51c2VybmFtZTtcbiAgaWYgKCFuYW1lKSByZXR1cm4gdXNhZ2UoJ3VwZGF0ZSAtLXVzZXJuYW1lIDxuYW1lPicpO1xuICBpZiAoIXVzZXJNYW5hZ2VyLmZpbmRVc2VyKG5hbWUsIHRydWUpKSByZXR1cm4gZXJyKGBubyBzdWNoIHVzZXI6ICR7bmFtZX1gKTtcblxuICBpZiAocGFyc2VkLmZsYWdzLmhhcygnZW5hYmxlJykgJiYgcGFyc2VkLmZsYWdzLmhhcygnZGlzYWJsZScpKSB7XG4gICAgcmV0dXJuIGVycigndXNlIGVpdGhlciAtLWVuYWJsZSBvciAtLWRpc2FibGUsIG5vdCBib3RoJyk7XG4gIH1cblxuICBjb25zdCBjaGFuZ2VzOiB7IHBhc3N3b3JkPzogc3RyaW5nOyBob21lPzogc3RyaW5nOyB1c2VybmFtZT86IHN0cmluZzsgcGVybT86IHN0cmluZzsgc3RhdHVzPzogYm9vbGVhbiB9ID0ge307XG4gIC8vIEtvbnVtc2FsIGFkIHZlcmlsZGl5c2UgYC0tdXNlcm5hbWVgIGVza2kgZGF2cmFuxLHFn2xhIHllbmkgYWTEsSBiZWxpcnRpci5cbiAgY29uc3QgbmV3VXNlcm5hbWUgPVxuICAgIHBhcnNlZC5wb3NpdGlvbmFsLmxlbmd0aCA+IDBcbiAgICAgID8gcGFyc2VkLnZhbHVlcy51c2VybmFtZSA/PyBwYXJzZWQudmFsdWVzWyduZXctdXNlcm5hbWUnXVxuICAgICAgOiBwYXJzZWQudmFsdWVzWyduZXctdXNlcm5hbWUnXTtcblxuICBpZiAobmV3VXNlcm5hbWUgIT09IHVuZGVmaW5lZCkgY2hhbmdlcy51c2VybmFtZSA9IG5ld1VzZXJuYW1lO1xuICBpZiAocGFyc2VkLnZhbHVlcy5wYXNzd29yZCAhPT0gdW5kZWZpbmVkKSBjaGFuZ2VzLnBhc3N3b3JkID0gcGFyc2VkLnZhbHVlcy5wYXNzd29yZDtcbiAgaWYgKHBhcnNlZC52YWx1ZXMuaG9tZSAhPT0gdW5kZWZpbmVkKSBjaGFuZ2VzLmhvbWUgPSBwYXJzZWQudmFsdWVzLmhvbWU7XG4gIGlmIChwYXJzZWQudmFsdWVzLnBlcm0gIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICghTElOVVhfUEVSTS50ZXN0KHBhcnNlZC52YWx1ZXMucGVybSkpIHtcbiAgICAgIHJldHVybiBlcnIoYGJhZCBwZXJtaXNzaW9uIHN0cmluZzogJHtwYXJzZWQudmFsdWVzLnBlcm19ICR7ZmFpbnQoJyhleHBlY3RlZCByd3hyLXhyLXgpJyl9YCk7XG4gICAgfVxuICAgIGNoYW5nZXMucGVybSA9IHBhcnNlZC52YWx1ZXMucGVybTtcbiAgfVxuICBpZiAocGFyc2VkLmZsYWdzLmhhcygnZW5hYmxlJykpIGNoYW5nZXMuc3RhdHVzID0gdHJ1ZTtcbiAgaWYgKHBhcnNlZC5mbGFncy5oYXMoJ2Rpc2FibGUnKSkgY2hhbmdlcy5zdGF0dXMgPSBmYWxzZTtcblxuICBpZiAoT2JqZWN0LmtleXMoY2hhbmdlcykubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxpbmVzOiBbXG4gICAgICAgIGAke3llbGxvdygnIScpfSBub3RoaW5nIHRvIHVwZGF0ZSBmb3IgJHtuYW1lfWAsXG4gICAgICAgIGhpbnQoJ3VwZGF0ZSAtLXVzZXJuYW1lIGFsaWNlIC0tcGFzc3dvcmQgbmV3IC0tcGVybSByd3hyLXhyLXgnKSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGFwcGxpZWQ6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGZhaWxlZDogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoY2hhbmdlcy5wYXNzd29yZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgKHVzZXJNYW5hZ2VyLmNoYW5nZVBhc3N3b3JkKG5hbWUsIGNoYW5nZXMucGFzc3dvcmQpID8gYXBwbGllZCA6IGZhaWxlZCkucHVzaCgncGFzc3dvcmQnKTtcbiAgfVxuICBpZiAoY2hhbmdlcy5ob21lICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBob21lRGlyID0gcmVzb2x2ZVRhcmdldChjdHgsIGNoYW5nZXMuaG9tZSk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGhvbWVEaXIpKSBmcy5ta2RpclN5bmMoaG9tZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgKHVzZXJNYW5hZ2VyLmNoYW5nZUhvbWVEaXIobmFtZSwgaG9tZURpcikgPyBhcHBsaWVkIDogZmFpbGVkKS5wdXNoKGBob21lIC0+ICR7aG9tZURpcn1gKTtcbiAgfVxuICBpZiAoY2hhbmdlcy5wZXJtICE9PSB1bmRlZmluZWQpIHtcbiAgICAodXNlck1hbmFnZXIudXBkYXRlUGVybWlzc2lvbnMobmFtZSwgZGIuZnJvbUxpbnV4U3RyaW5nKGNoYW5nZXMucGVybSkpID8gYXBwbGllZCA6IGZhaWxlZClcbiAgICAgIC5wdXNoKGBwZXJtIC0+ICR7Y2hhbmdlcy5wZXJtfWApO1xuICB9XG4gIC8vIER1cnVtLCBrdWxsYW7EsWPEsSBhZMSxIGRlxJ9pxZ90aXJpbG1lZGVuIMO2bmNlIHV5Z3VsYW7EsXIgKGVza2kgYWQgZ2VyZWtsaSkuXG4gIGlmIChjaGFuZ2VzLnN0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgKHVzZXJNYW5hZ2VyLnRvZ2dsZVVzZXJTdGF0dXMobmFtZSwgY2hhbmdlcy5zdGF0dXMpID8gYXBwbGllZCA6IGZhaWxlZClcbiAgICAgIC5wdXNoKGNoYW5nZXMuc3RhdHVzID8gJ2VuYWJsZWQnIDogJ2Rpc2FibGVkJyk7XG4gIH1cbiAgaWYgKGNoYW5nZXMudXNlcm5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh1c2VyTWFuYWdlci5maW5kVXNlcihjaGFuZ2VzLnVzZXJuYW1lLCB0cnVlKSkgZmFpbGVkLnB1c2goYHVzZXJuYW1lIFwiJHtjaGFuZ2VzLnVzZXJuYW1lfVwiIGFscmVhZHkgZXhpc3RzYCk7XG4gICAgZWxzZSAodXNlck1hbmFnZXIuY2hhbmdlVXNlcm5hbWUobmFtZSwgY2hhbmdlcy51c2VybmFtZSkgPyBhcHBsaWVkIDogZmFpbGVkKVxuICAgICAgLnB1c2goYHVzZXJuYW1lIC0+ICR7Y2hhbmdlcy51c2VybmFtZX1gKTtcbiAgfVxuXG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBhcHBsaWVkKSBsaW5lcy5wdXNoKG9rKGAke25hbWV9OiAke2NoYW5nZX1gKSk7XG4gIGZvciAoY29uc3QgY2hhbmdlIG9mIGZhaWxlZCkgbGluZXMucHVzaChgJHtyZWQoJ+KclycpfSAke25hbWV9OiAke2NoYW5nZX1gKTtcbiAgcmV0dXJuIHsgbGluZXMgfTtcbn07XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIEFZQVIgKENPTkZJRykgS09NVVRMQVJJXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmNvbnN0IENPTkZJR19LRVlTOiBTZXR0aW5nS2V5W10gPSBbXG4gICdwb3J0JyxcbiAgJ2RhdGFQb3J0JyxcbiAgJ21heENvbm5lY3Rpb25zJyxcbiAgJ2xvZ0xldmVsJyxcbiAgJ2Jhbm5lcicsXG4gICdwYXNzaXZlUG9ydFJhbmdlJyxcbiAgJ3Bhc3NpdmVJcCcsXG4gICdpcCcsXG4gICdkYlBhdGgnLFxuXTtcblxuLyoqIFlhbG7EsXpjYSB5ZW5pZGVuIGJhxZ9sYXTEsW5jYSBldGtpbGkgb2xhbiBheWFybGFyLiAqL1xuY29uc3QgUkVTVEFSVF9LRVlTOiBTZXR0aW5nS2V5W10gPSBbJ3BvcnQnLCAnZGF0YVBvcnQnLCAnbWF4Q29ubmVjdGlvbnMnLCAncGFzc2l2ZVBvcnRSYW5nZScsICdpcCcsICdwYXNzaXZlSXAnXTtcblxuZnVuY3Rpb24gaXNDb25maWdLZXkodmFsdWU6IHN0cmluZyk6IFNldHRpbmdLZXkgfCBudWxsIHtcbiAgY29uc3QgbmVlZGxlID0gdmFsdWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9eZnRwXFwuLywgJycpO1xuICByZXR1cm4gQ09ORklHX0tFWVMuZmluZCgoa2V5KSA9PiBrZXkudG9Mb3dlckNhc2UoKSA9PT0gbmVlZGxlKSA/PyBudWxsO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRTZXR0aW5nVmFsdWUoa2V5OiBTZXR0aW5nS2V5LCBjZmc6IFJlYWRvbmx5PEludGVybmFsU2VydmVyQ29uZmlnPik6IHN0cmluZyB7XG4gIHN3aXRjaCAoa2V5KSB7XG4gICAgY2FzZSAncGFzc2l2ZVBvcnRSYW5nZSc6XG4gICAgICByZXR1cm4gYCR7Y2ZnLnBhc3NpdmVQb3J0UmFuZ2UubWlufToke2NmZy5wYXNzaXZlUG9ydFJhbmdlLm1heH1gO1xuICAgIGNhc2UgJ2Jhbm5lcic6IHtcbiAgICAgIGNvbnN0IGJhbm5lciA9IGNmZy5iYW5uZXIgPz8gJyc7XG4gICAgICByZXR1cm4gYmFubmVyLmxlbmd0aCA+IDUyID8gYCR7YmFubmVyLnNsaWNlKDAsIDQ5KX0uLi5gIDogYmFubmVyO1xuICAgIH1cbiAgICBjYXNlICdwYXNzaXZlSXAnOlxuICAgICAgcmV0dXJuIGNmZy5wYXNzaXZlSXA/LnRyaW0oKSA/IGNmZy5wYXNzaXZlSXAgOiAnKGF1dG8pJztcbiAgICBjYXNlICdpcCc6XG4gICAgICByZXR1cm4gY2ZnLmlwPy50cmltKCkgPyBjZmcuaXAgOiAnKGF1dG8pJztcbiAgICBjYXNlICdkYlBhdGgnOlxuICAgICAgcmV0dXJuIGNmZy5kYlBhdGggPz8gJyc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBTdHJpbmcoKGNmZyBhcyBhbnkpW2tleV0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2V0dGluZ1ZhbHVlKFxuICBrZXk6IFNldHRpbmdLZXksXG4gIHJhdzogc3RyaW5nLFxuKTogeyBvazogdHJ1ZTsgdmFsdWU6IHVua25vd24gfSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nIH0ge1xuICBjb25zdCB0ZXh0ID0gcmF3LnRyaW0oKTtcblxuICBpZiAoa2V5ID09PSAnZGJQYXRoJykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ2RiUGF0aCBpcyByZWFkLW9ubHkgKGNvbnN0cnVjdG9yIG9wdGlvbiknIH07XG5cbiAgaWYgKGtleSA9PT0gJ3BvcnQnIHx8IGtleSA9PT0gJ2RhdGFQb3J0Jykge1xuICAgIGNvbnN0IG51bSA9IE51bWJlcih0ZXh0KTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobnVtKSB8fCBudW0gPCAxIHx8IG51bSA+IDY1NTM1KSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBgJHtrZXl9IG11c3QgYmUgMS02NTUzNWAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiBudW0gfTtcbiAgfVxuXG4gIGlmIChrZXkgPT09ICdtYXhDb25uZWN0aW9ucycpIHtcbiAgICBjb25zdCBudW0gPSBOdW1iZXIodGV4dCk7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG51bSkgfHwgbnVtIDwgMSkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ21heENvbm5lY3Rpb25zIG11c3QgYmUgPj0gMScgfTtcbiAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IG51bSB9O1xuICB9XG5cbiAgaWYgKGtleSA9PT0gJ2xvZ0xldmVsJykge1xuICAgIGNvbnN0IGxldmVsID0gdGV4dC50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICghWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXS5pbmNsdWRlcyhsZXZlbCkpIHtcbiAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdsb2dMZXZlbCBtdXN0IGJlIGRlYnVnIHwgaW5mbyB8IHdhcm4gfCBlcnJvcicgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHZhbHVlOiBsZXZlbCB9O1xuICB9XG5cbiAgaWYgKGtleSA9PT0gJ3Bhc3NpdmVQb3J0UmFuZ2UnKSB7XG4gICAgY29uc3QgbWF0Y2ggPSB0ZXh0Lm1hdGNoKC9eKFxcZHsxLDV9KVxccypbOlxcLVxcc11cXHMqKFxcZHsxLDV9KSQvKTtcbiAgICBpZiAoIW1hdGNoKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnZXhwZWN0ZWQgbWluOm1heCAoZS5nLiA1MDAwMDo1MDA1MCknIH07XG4gICAgY29uc3QgbWluID0gTnVtYmVyKG1hdGNoWzFdKTtcbiAgICBjb25zdCBtYXggPSBOdW1iZXIobWF0Y2hbMl0pO1xuICAgIGlmIChtaW4gPCAxIHx8IG1heCA+IDY1NTM1IHx8IG1pbiA+IG1heCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ2ludmFsaWQgcG9ydCByYW5nZScgfTtcbiAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHsgbWluLCBtYXggfSB9O1xuICB9XG5cbiAgaWYgKGtleSA9PT0gJ2Jhbm5lcicpIHtcbiAgICBpZiAodGV4dCA9PT0gJycpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdiYW5uZXIgY2Fubm90IGJlIGVtcHR5IChvbWl0IHRvIHJlc2V0KScgfTtcbiAgICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHRleHQgfTtcbiAgfVxuXG4gIC8vIGlwIC8gcGFzc2l2ZUlwXG4gIGlmICh0ZXh0ID09PSAnJykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogYCR7a2V5fSBjYW5ub3QgYmUgZW1wdHkgKHVzZSBhdXRvIGZvciBhdXRvbWF0aWMpYCB9O1xuICByZXR1cm4geyBvazogdHJ1ZSwgdmFsdWU6IHRleHQudG9Mb3dlckNhc2UoKSA9PT0gJ2F1dG8nID8gJycgOiB0ZXh0IH07XG59XG5cbmZ1bmN0aW9uIGNvbmZpZ1Nob3coYXJnczogc3RyaW5nW10sIGN0eDogRnRwQ2xpQ29udGV4dCk6IEZ0cENvbW1hbmRSZXN1bHQge1xuICBjb25zdCBjZmcgPSBjdHguc2VydmVyLmdldFJ1bnRpbWVDb25maWcoKTtcbiAgY29uc3QgbGluZXMgPSBDT05GSUdfS0VZUy5tYXAoKGtleSkgPT4ge1xuICAgIGNvbnN0IHN0YXIgPSBSRVNUQVJUX0tFWVMuaW5jbHVkZXMoa2V5KSA/IGZhaW50KCcqJykgOiAnJztcbiAgICByZXR1cm4gYCAgJHtib2xkKGtleS5wYWRFbmQoMTcpKX0gJHtmb3JtYXRTZXR0aW5nVmFsdWUoa2V5LCBjZmcpfSAke3N0YXJ9YDtcbiAgfSk7XG4gIGxpbmVzLnB1c2goJycpO1xuICBsaW5lcy5wdXNoKGZhaW50KCcgICogcmVzdGFydCByZXF1aXJlZCB0byB0YWtlIGVmZmVjdCcpKTtcbiAgcmV0dXJuIHsgbGluZXMgfTtcbn1cblxuZnVuY3Rpb24gY29uZmlnR2V0KGFyZ3M6IHN0cmluZ1tdLCBjdHg6IEZ0cENsaUNvbnRleHQpOiBGdHBDb21tYW5kUmVzdWx0IHtcbiAgaWYgKCFhcmdzWzBdKSByZXR1cm4gdXNhZ2UoJ2NvbmZpZyBnZXQgPGtleT4nKTtcbiAgY29uc3Qga2V5ID0gaXNDb25maWdLZXkoYXJnc1swXSk7XG4gIGlmICgha2V5KSByZXR1cm4gZXJyKGB1bmtub3duIHNldHRpbmc6ICR7YXJnc1swXX1gKTtcbiAgY29uc3QgY2ZnID0gY3R4LnNlcnZlci5nZXRSdW50aW1lQ29uZmlnKCk7XG4gIHJldHVybiB7IGxpbmVzOiBbYCR7Y3lhbihrZXkpfSA9ICR7Zm9ybWF0U2V0dGluZ1ZhbHVlKGtleSwgY2ZnKX1gXSB9O1xufVxuXG5mdW5jdGlvbiBjb25maWdTZXQoYXJnczogc3RyaW5nW10sIGN0eDogRnRwQ2xpQ29udGV4dCk6IEZ0cENvbW1hbmRSZXN1bHQge1xuICBpZiAoYXJncy5sZW5ndGggPCAxKSByZXR1cm4gdXNhZ2UoJ2NvbmZpZyBzZXQgPGtleT4gPHZhbHVlPicpO1xuICBjb25zdCBrZXkgPSBpc0NvbmZpZ0tleShhcmdzWzBdKTtcbiAgaWYgKCFrZXkpIHJldHVybiBlcnIoYHVua25vd24gc2V0dGluZzogJHthcmdzWzBdfSAke2ZhaW50KCcodHJ5OiBjb25maWcgc2hvdyknKX1gKTtcblxuICBjb25zdCByYXcgPSBhcmdzLnNsaWNlKDEpLmpvaW4oJyAnKS50cmltKCk7XG4gIGlmIChyYXcgPT09ICcnKSByZXR1cm4gdXNhZ2UoYGNvbmZpZyBzZXQgJHtrZXl9IDx2YWx1ZT5gKTtcblxuICBjb25zdCBwYXJzZWQgPSBwYXJzZVNldHRpbmdWYWx1ZShrZXksIHJhdyk7XG4gIGlmICghcGFyc2VkLm9rKSByZXR1cm4gZXJyKHBhcnNlZC5lcnJvcik7XG5cbiAgY3R4LnNlcnZlci51cGRhdGVTZXR0aW5nKGtleSwgcGFyc2VkLnZhbHVlKTtcbiAgY29uc3QgY2ZnID0gY3R4LnNlcnZlci5nZXRSdW50aW1lQ29uZmlnKCk7XG4gIGxldCByZXN0YXJ0TXNnID0gJyc7XG4gIGlmIChSRVNUQVJUX0tFWVMuaW5jbHVkZXMoa2V5KSkge1xuICAgIC8vIE90b21hdGlrIHJlc3RhcnQ6IHN1bnVjdXl1IGR1cmR1cnVwIHllbmlkZW4gYmHFn2xhXG4gICAgY3R4LnNlcnZlci5zdG9wKCk7XG4gICAgY3R4LnNlcnZlci5zdGFydCgpO1xuICAgIHJlc3RhcnRNc2cgPSBgICR7ZmFpbnQoJ8K3IHJlc3RhcnQgcmVxdWlyZWQgYW5kIGFwcGxpZWQnKX1gO1xuICB9IGVsc2Uge1xuICAgIHJlc3RhcnRNc2cgPSBgICR7ZmFpbnQoJ8K3IG5vIHJlc3RhcnQgcmVxdWlyZWQnKX1gO1xuICB9XG4gIHJldHVybiB7IGxpbmVzOiBbb2soYCR7a2V5fSA9ICR7Zm9ybWF0U2V0dGluZ1ZhbHVlKGtleSwgY2ZnKX0ke3Jlc3RhcnRNc2d9YCldIH07XG59XG5cbmZ1bmN0aW9uIGNvbmZpZ1Vuc2V0KGFyZ3M6IHN0cmluZ1tdLCBjdHg6IEZ0cENsaUNvbnRleHQpOiBGdHBDb21tYW5kUmVzdWx0IHtcbiAgaWYgKCFhcmdzWzBdKSByZXR1cm4gdXNhZ2UoJ2NvbmZpZyB1bnNldCA8a2V5PicpO1xuICBjb25zdCBrZXkgPSBpc0NvbmZpZ0tleShhcmdzWzBdKTtcbiAgaWYgKCFrZXkpIHJldHVybiBlcnIoYHVua25vd24gc2V0dGluZzogJHthcmdzWzBdfWApO1xuICBjb25zdCByZW1vdmVkID0gY3R4LnNlcnZlci5jbGVhclNldHRpbmcoa2V5KTtcbiAgaWYgKCFyZW1vdmVkKSByZXR1cm4gZXJyKGAke2tleX0gaXMgbm90IHN0b3JlZCBpbiB0aGUgZGF0YWJhc2VgKTtcbiAgbGV0IHJlc3RhcnRNc2cgPSAnJztcbiAgaWYgKFJFU1RBUlRfS0VZUy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgY3R4LnNlcnZlci5zdG9wKCk7XG4gICAgY3R4LnNlcnZlci5zdGFydCgpO1xuICAgIHJlc3RhcnRNc2cgPSBgICR7ZmFpbnQoJ8K3IHJlc3RhcnQgYXBwbGllZCcpfWA7XG4gIH0gZWxzZSB7XG4gICAgcmVzdGFydE1zZyA9IGAgJHtmYWludCgnwrcgZGVmYXVsdCB2YWx1ZSB1c2VkIGFmdGVyIHJlc3RhcnQnKX1gO1xuICB9XG4gIHJldHVybiB7XG4gICAgbGluZXM6IFtcbiAgICAgIG9rKGAke2tleX0gcmVtb3ZlZCBmcm9tIHNldHRpbmdzJHtyZXN0YXJ0TXNnfWApLFxuICAgICAgaGludCgndGhlIGRlZmF1bHQgdmFsdWUgaXMgdXNlZCBhZnRlciByZXN0YXJ0JyksXG4gICAgXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29uZmlnUGF0aChfYXJnczogc3RyaW5nW10sIGN0eDogRnRwQ2xpQ29udGV4dCk6IEZ0cENvbW1hbmRSZXN1bHQge1xuICBjb25zdCBjZmcgPSBjdHguc2VydmVyLmdldFJ1bnRpbWVDb25maWcoKTtcbiAgY29uc3QgbGFiZWwgPSAodGV4dDogc3RyaW5nKTogc3RyaW5nID0+IGAgICR7Ym9sZCh0ZXh0LnBhZEVuZCg4KSl9IGA7XG4gIHJldHVybiB7XG4gICAgbGluZXM6IFtcbiAgICAgIGAke2xhYmVsKCdkYXRhYmFzZScpfSAke2NmZy5kYlBhdGggPz8gJy4vZnRwZC5kYid9YCxcbiAgICAgIGAke2xhYmVsKCd0YWJsZXMnKX0gdXNlcnMsIHNldHRpbmdzLCBsb2dzYCxcbiAgICAgIGAke2xhYmVsKCdoaXN0b3J5Jyl9ICR7cGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuZnRwZF9oaXN0b3J5Jyl9YCxcbiAgICBdLFxuICB9O1xufVxuXG4vKipcbiAqIGBjb25maWdgIChhcmfDvG1hbnPEsXopIOKGkiBpbnRlcmFrdGlmIHNlw6dpbSBtZW7DvHPDvC5cbiAqIGdpdF9jbGlfcHJvamVjdCBpbGUgYXluxLEgdGFzYXLEsW06IG51bWFyYWzEsSBsaXN0ZSArIGBbZGXEn2VyXWAgZ2lyZGkuXG4gKi9cbmNvbnN0IENPTkZJR19NRU5VX0NIT0lDRVM6IFBhcnRpYWw8UmVjb3JkPFNldHRpbmdLZXksIHN0cmluZ1tdPj4gPSB7XG4gIGxvZ0xldmVsOiBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddLFxufTtcblxuLyoqIE1lbsO8ZGVraSBcIkNsZWFyIGxvZ3NcIiBzYXTEsXLEsSAoMSB0YWJhbmzEsSkgdmUgb251IGl6bGV5ZW4gXCJCYWNrXCIgc2F0xLFyxLEuICovXG5jb25zdCBDT05GSUdfQ0xFQVJfTE9HU19JTkRFWCA9IENPTkZJR19LRVlTLmxlbmd0aCArIDE7XG5jb25zdCBDT05GSUdfQkFDS19JTkRFWCA9IENPTkZJR19LRVlTLmxlbmd0aCArIDI7XG5cbi8qKiBUYWJsb2Rha2kgbG9nIHNhdMSxcsSxIHNhecSxc8SxIChoYXRhIG9sdXJzYSAwKS4gKi9cbmZ1bmN0aW9uIGNvdW50TG9ncyhjdHg6IEZ0cENsaUNvbnRleHQpOiBudW1iZXIge1xuICB0cnkge1xuICAgIC8vIEZUUCBpxZ9sZW1pIHlva2tlbiBiZWtsZXllbiB0YW1wb24gaGVuw7x6IHRhYmxveWEgeWF6xLFsbWFtxLHFnyBvbGFiaWxpci5cbiAgICByZXR1cm4gY3R4LnNlcnZlci5nZXREYigpLmdldExvZ0NvdW50KCkgKyBMb2dnZXIuZ2V0QnVmZmVyZWRDb3VudCgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gTG9nZ2VyLmdldEJ1ZmZlcmVkQ291bnQoKTtcbiAgfVxufVxuXG4vKipcbiAqIGBsb2dzYCB0YWJsb3N1bnUgZWxsZSBzaWw6IMO2bmNlIGBbeS9uXWAgb25hecSxIGlzdGVyLCBgeWAgZMSxxZ/EsW5kYWtpXG4gKiBjZXZhcGxhcmRhIGhpw6diaXIgxZ9leSBzaWxpbm1lei5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY2xlYXJMb2dzV2l0aENvbmZpcm1hdGlvbihjdHg6IEZ0cENsaUNvbnRleHQpOiBQcm9taXNlPEZ0cENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3QgdG90YWwgPSBjb3VudExvZ3MoY3R4KTtcbiAgaWYgKHRvdGFsID09PSAwKSB7XG4gICAgcmV0dXJuIHsgbGluZXM6IFtoaW50KCdsb2dzIHRhYmxlIGlzIGFscmVhZHkgZW1wdHknKV0gfTtcbiAgfVxuXG4gIGNvbnN0IGFuc3dlciA9IChhd2FpdCBhc2soYERlbGV0ZSBhbGwgJHt0b3RhbH0gbG9nIHJlY29yZHM/IFt5L25dOiBgKSkudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChhbnN3ZXIgIT09ICd5JyAmJiBhbnN3ZXIgIT09ICd5ZXMnKSB7XG4gICAgcmV0dXJuIHsgbGluZXM6IFtgJHt5ZWxsb3coJyEnKX0gbG9nIGRlbGV0aW9uIGNhbmNlbGxlZGBdIH07XG4gIH1cblxuICB0cnkge1xuICAgIC8vIEJlbGxla3RlIGJla2xleWVubGVyIGRlIGF0xLFsbWFsxLE7IHlva3NhIGJpcmF6IHNvbnJhIHRhYmxveWEgZ2VyaSB5YXrEsWzEsXIuXG4gICAgTG9nZ2VyLmRpc2NhcmRCdWZmZXJlZCgpO1xuICAgIGNvbnN0IGRlbGV0ZWQgPSBjdHguc2VydmVyLmdldERiKCkuY2xlYXJMb2dzKCk7XG4gICAgcmV0dXJuIHsgbGluZXM6IFtvayhgbG9ncyBjbGVhcmVkICgke2RlbGV0ZWR9IHJvd3MgZGVsZXRlZClgKV0gfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gZXJyKGBjb3VsZCBub3QgY2xlYXIgbG9nczogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc2hvd0NvbmZpZ01lbnUoY3R4OiBGdHBDbGlDb250ZXh0KTogUHJvbWlzZTxGdHBDb21tYW5kUmVzdWx0PiB7XG4gIGZvciAoOzspIHtcbiAgICBjb25zdCBjZmcgPSBjdHguc2VydmVyLmdldFJ1bnRpbWVDb25maWcoKTtcblxuICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICBDT05GSUdfS0VZUy5mb3JFYWNoKChrZXksIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGZvcm1hdFNldHRpbmdWYWx1ZShrZXksIGNmZyk7XG4gICAgICBjb25zdCBub3RlID1cbiAgICAgICAga2V5ID09PSAnZGJQYXRoJ1xuICAgICAgICAgID8gZmFpbnQoJyhyZWFkLW9ubHkpJylcbiAgICAgICAgICA6IFJFU1RBUlRfS0VZUy5pbmNsdWRlcyhrZXkpXG4gICAgICAgICAgICA/IGZhaW50KCcqJylcbiAgICAgICAgICAgIDogJyc7XG4gICAgICBjb25zb2xlLmxvZyhgICBbJHtpbmRleCArIDF9XSAke2N5YW4oa2V5LnBhZEVuZCgxNykpfSAke2RpbSh2YWx1ZSl9ICR7bm90ZX1gKTtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGAgIFske0NPTkZJR19DTEVBUl9MT0dTX0lOREVYfV0gJHtjeWFuKCdDbGVhciBsb2dzJy5wYWRFbmQoMTcpKX0gJHtkaW0oYCR7Y291bnRMb2dzKGN0eCl9IHJvd3NgKX1gLFxuICAgICk7XG4gICAgY29uc29sZS5sb2coYCAgWyR7Q09ORklHX0JBQ0tfSU5ERVh9XSAke2RpbSgnQmFjaycpfWApO1xuICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICBjb25zb2xlLmxvZyhmYWludChgICAqIHJlc3RhcnQgcmVxdWlyZWQgdG8gdGFrZSBlZmZlY3RgKSk7XG4gICAgY29uc29sZS5sb2coJycpO1xuXG4gICAgY29uc3QgY2hvaWNlID0gKGF3YWl0IGFzayhgU2VsZWN0IGFuIG9wdGlvbiBbMS0ke0NPTkZJR19CQUNLX0lOREVYfV06IGApKS50cmltKCk7XG4gICAgaWYgKGNob2ljZSA9PT0gJycgfHwgY2hvaWNlID09PSAnMCcgfHwgY2hvaWNlID09PSBTdHJpbmcoQ09ORklHX0JBQ0tfSU5ERVgpKSB7XG4gICAgICByZXR1cm4geyBsaW5lczogW10gfTtcbiAgICB9XG5cbiAgICBpZiAoY2hvaWNlID09PSBTdHJpbmcoQ09ORklHX0NMRUFSX0xPR1NfSU5ERVgpKSB7XG4gICAgICByZXR1cm4gY2xlYXJMb2dzV2l0aENvbmZpcm1hdGlvbihjdHgpO1xuICAgIH1cblxuICAgIGNvbnN0IGluZGV4ID0gTnVtYmVyKGNob2ljZSkgLSAxO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihpbmRleCkgfHwgaW5kZXggPCAwIHx8IGluZGV4ID49IENPTkZJR19LRVlTLmxlbmd0aCkge1xuICAgICAgY29uc29sZS5sb2coYCR7cmVkKCfinJcnKX0gSW52YWxpZCBvcHRpb24uIFBsZWFzZSBzZWxlY3QgMS0ke0NPTkZJR19CQUNLX0lOREVYfS5gKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGtleSA9IENPTkZJR19LRVlTW2luZGV4XTtcbiAgICBpZiAoa2V5ID09PSAnZGJQYXRoJykge1xuICAgICAgY29uc29sZS5sb2coYCR7eWVsbG93KCchJyl9IGRiUGF0aCBpcyByZWFkLW9ubHkgKGNvbnN0cnVjdG9yIG9wdGlvbikuYCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBsZXQgdmFsdWU6IHN0cmluZztcbiAgICBjb25zdCBjaG9pY2VzID0gQ09ORklHX01FTlVfQ0hPSUNFU1trZXldO1xuICAgIGlmIChjaG9pY2VzKSB7XG4gICAgICAvLyBTZcOnbWVsaSBla3JhbjogZGXEn2VybGVyIG51bWFyYWzEsSBvbGFyYWsgbGlzdGVsZW5pci5cbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgIGNob2ljZXMuZm9yRWFjaCgoY2hvaWNlVGV4dCwgaSkgPT4gY29uc29sZS5sb2coYCAgICBbJHtpICsgMX1dICR7Y3lhbihjaG9pY2VUZXh0KX1gKSk7XG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICBjb25zdCBwaWNrID0gKGF3YWl0IGFzayhgICAke2tleX0gWzEtJHtjaG9pY2VzLmxlbmd0aH1dIChFbnRlciBrZWVwcyBjdXJyZW50KTogYCkpLnRyaW0oKTtcbiAgICAgIGlmIChwaWNrID09PSAnJykgY29udGludWU7XG4gICAgICBjb25zdCBwaWNrZWQgPSBOdW1iZXIocGljaykgLSAxO1xuICAgICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKHBpY2tlZCkgfHwgcGlja2VkIDwgMCB8fCBwaWNrZWQgPj0gY2hvaWNlcy5sZW5ndGgpIHtcbiAgICAgICAgY29uc29sZS5sb2coYCR7cmVkKCfinJcnKX0gSW52YWxpZCBjaG9pY2UuIFBsZWFzZSBzZWxlY3QgMS0ke2Nob2ljZXMubGVuZ3RofS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IGNob2ljZXNbcGlja2VkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY3VycmVudCA9IGZvcm1hdFNldHRpbmdWYWx1ZShrZXksIGNmZyk7XG4gICAgICBjb25zdCBhbnN3ZXIgPSAoYXdhaXQgYXNrKGAke2tleX0gWyR7Y3VycmVudH1dOiBgKSkudHJpbSgpO1xuICAgICAgaWYgKGFuc3dlciA9PT0gJycpIGNvbnRpbnVlO1xuICAgICAgdmFsdWUgPSBhbnN3ZXI7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gY29uZmlnU2V0KFtrZXksIHZhbHVlXSwgY3R4KTtcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgcmVzdWx0LmxpbmVzKSBjb25zb2xlLmxvZyhsaW5lKTtcbiAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICAvLyBBeWFyIGfDvG5jZWxsZW5kaSDihpIga2FidcSfYSBkw7ZuOyBtZW7DvCB0ZWtyYXIgw6dpemlsbWV6LlxuICAgIHJldHVybiB7IGxpbmVzOiBbXSB9O1xuICB9XG59XG5cbmNvbnN0IGNvbmZpZ0NvbW1hbmQ6IEhhbmRsZXIgPSBhc3luYyAoYXJncywgY3R4KSA9PiB7XG4gIC8vIGBjb25maWdgIHRlayBiYcWfxLFuYSDihpIgc2XDp21lbGkgZ2lyZGkgZWtyYW7EsSAoZ2l0X2NsaV9wcm9qZWN0IGdpYmkpXG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHNob3dDb25maWdNZW51KGN0eCk7XG5cbiAgY29uc3Qgc3ViID0gYXJnc1swXS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCByZXN0ID0gYXJncy5zbGljZSgxKTtcbiAgc3dpdGNoIChzdWIpIHtcbiAgICBjYXNlICdzaG93JzpcbiAgICBjYXNlICdsaXN0JzpcbiAgICAgIHJldHVybiBjb25maWdTaG93KHJlc3QsIGN0eCk7XG4gICAgY2FzZSAnbWVudSc6XG4gICAgICByZXR1cm4gc2hvd0NvbmZpZ01lbnUoY3R4KTtcbiAgICBjYXNlICdnZXQnOlxuICAgICAgcmV0dXJuIGNvbmZpZ0dldChyZXN0LCBjdHgpO1xuICAgIGNhc2UgJ3NldCc6XG4gICAgICByZXR1cm4gY29uZmlnU2V0KHJlc3QsIGN0eCk7XG4gICAgY2FzZSAndW5zZXQnOlxuICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICByZXR1cm4gY29uZmlnVW5zZXQocmVzdCwgY3R4KTtcbiAgICBjYXNlICdwYXRoJzpcbiAgICAgIHJldHVybiBjb25maWdQYXRoKHJlc3QsIGN0eCk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxpbmVzOiBbXG4gICAgICAgICAgYCR7cmVkKCfinJcnKX0gdW5rbm93biBjb25maWcgc3ViY29tbWFuZDogJHtzdWJ9YCxcbiAgICAgICAgICBoaW50KCdjb25maWcgfCBjb25maWcgc2hvdyB8IGdldCB8IHNldCB8IHVuc2V0IHwgcGF0aCcpLFxuICAgICAgICBdLFxuICAgICAgfTtcbiAgfVxufTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgT1RVUlVNIEtPTVVUTEFSSVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5jb25zdCBzdGF0dXM6IEhhbmRsZXIgPSAoX2FyZ3MsIGN0eCkgPT4ge1xuICBjb25zdCBjZmcgPSBjdHguc2VydmVyLmdldFJ1bnRpbWVDb25maWcoKTtcbiAgY29uc3QgbGlzdGVuaW5nID0gY3R4LnNlcnZlci5pc0xpc3RlbmluZygpO1xuICBjb25zdCB1c2VyTWFuYWdlciA9IGN0eC5zZXJ2ZXIuZ2V0VXNlck1hbmFnZXIoKTtcbiAgY29uc3QgdXNlcnMgPSB1c2VyTWFuYWdlcj8uZ2V0VXNlckNvdW50KCkgPz8gMDtcbiAgY29uc3QgbGFiZWwgPSAodGV4dDogc3RyaW5nKTogc3RyaW5nID0+IGAgICR7Ym9sZCh0ZXh0LnBhZEVuZCg4KSl9IGA7XG5cbiAgcmV0dXJuIHtcbiAgICBsaW5lczogW1xuICAgICAgYCR7bGFiZWwoJ3NlcnZlcicpfSAke2xpc3RlbmluZyA/IGdyZWVuKCdsaXN0ZW5pbmcnKSA6IHJlZCgnc3RvcHBlZCcpfSAke2ZhaW50KCdvbicpfSA6JHtjZmcucG9ydH0gJHtmYWludCgnZGF0YScpfSA6JHtjZmcuZGF0YVBvcnR9YCxcbiAgICAgIGAke2xhYmVsKCdjbGllbnRzJyl9ICR7Y3R4LnNlcnZlci5nZXRDb25uZWN0aW9uQ291bnQoKX0gLyAke2NmZy5tYXhDb25uZWN0aW9uc31gLFxuICAgICAgYCR7bGFiZWwoJ2xvZycpfSAke2NmZy5sb2dMZXZlbH1gLFxuICAgICAgYCR7bGFiZWwoJ3Bhc3YnKX0gJHtjZmcucGFzc2l2ZVBvcnRSYW5nZS5taW59OiR7Y2ZnLnBhc3NpdmVQb3J0UmFuZ2UubWF4fSAke2NmZy5wYXNzaXZlSXAgPyBkaW0oYCgke2NmZy5wYXNzaXZlSXB9KWApIDogJyd9YCxcbiAgICAgIGAke2xhYmVsKCdiYW5uZXInKX0gJHtjZmcuYmFubmVyfWAsXG4gICAgICBgJHtsYWJlbCgndXNlcnMnKX0gJHt1c2Vyc30gaW4gJHtjZmcuZGJQYXRoID8/ICcuL2Z0cGQuZGInfWAsXG4gICAgICBgJHtsYWJlbCgnc2Vzc2lvbicpfSAke2N0eC51c2VyID8gY3lhbihjdHgudXNlcikgOiB5ZWxsb3coJ25vbmUnKX0gJHtmYWludCgnQCcpfSAke2RpbShjdHguY3VycmVudERpciB8fCBjdHguaG9tZURpciB8fCAnLScpfWAsXG4gICAgXSxcbiAgfTtcbn07XG5cbmNvbnN0IHdob2FtaTogSGFuZGxlciA9IChfYXJncywgY3R4KSA9PiB7XG4gIC8vIExvZ2luIGdlcmVrbWV6OyBjdHgudXNlciB6YXRlbiBzZXQgZWRpbG1pxZ9zZSBnw7ZzdGVyLCB5b2tzYSBiaWxnaWxlbmRpci5cbiAgY29uc3QgdXNlciA9IGN0eC51c2VyIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKCF1c2VyKSB7XG4gICAgcmV0dXJuIHsgbGluZXM6IFt5ZWxsb3coJyEnKSArICcgbm8gc2Vzc2lvbiBhY2NvdW50J10gfTtcbiAgfVxuICBjb25zdCBhY2NvdW50ID0gY3R4LnNlcnZlci5nZXRVc2VyTWFuYWdlcigpPy5maW5kVXNlcih1c2VyLCB0cnVlKTtcbiAgY29uc3QgbGFiZWwgPSAodGV4dDogc3RyaW5nKTogc3RyaW5nID0+IGAgICR7Ym9sZCh0ZXh0LnBhZEVuZCg2KSl9IGA7XG4gIHJldHVybiB7XG4gICAgbGluZXM6IFtcbiAgICAgIGAke2xhYmVsKCd1c2VyJyl9ICR7Y3lhbih1c2VyKX0gJHthY2NvdW50Py5pc0FjdGl2ZSA/IGdyZWVuKCcoYWN0aXZlKScpIDogeWVsbG93KCcoZGlzYWJsZWQpJyl9YCxcbiAgICAgIGAke2xhYmVsKCdob21lJyl9ICR7ZGltKGFjY291bnQ/LmhvbWVEaXIgPz8gY3R4LmhvbWVEaXIpfWAsXG4gICAgICBgJHtsYWJlbCgnY3dkJyl9ICR7ZGltKGN0eC5jdXJyZW50RGlyIHx8IGN0eC5ob21lRGlyKX1gLFxuICAgICAgYCR7bGFiZWwoJ3Blcm1zJyl9ICR7Ym9sZChwZXJtaXNzaW9uU3RyaW5nKGN0eCwgdXNlcikpfSAke2ZhaW50KCcob3duZXIvZ3JvdXAvb3RoZXJzKScpfWAsXG4gICAgXSxcbiAgfTtcbn07XG5cbi8qKiBGVFAgc2VydmVyIGJhxZ9sYXQgKi9cbmNvbnN0IHN0YXJ0U2VydmVyOiBIYW5kbGVyID0gKGFyZ3MsIGN0eCkgPT4ge1xuICBjb25zdCBzZXJ2ZXIgPSBjdHguc2VydmVyO1xuICBjb25zdCBjZmcgPSBzZXJ2ZXIuZ2V0UnVudGltZUNvbmZpZygpO1xuICBpZiAoc2VydmVyLmlzTGlzdGVuaW5nKCkpIHtcbiAgICByZXR1cm4geyBsaW5lczogW2Ake3llbGxvdygnIScpfSBzZXJ2ZXIgYWxyZWFkeSBydW5uaW5nIG9uIHBvcnQgJHtjZmcucG9ydH1gXSB9O1xuICB9XG4gIHNlcnZlci5zdGFydCgpO1xuICByZXR1cm4geyBsaW5lczogW2Ake2dyZWVuKCfinJMnKX0gRlRQIHNlcnZlciBzdGFydGVkIG9uIHBvcnQgJHtjZmcucG9ydH1gXSB9O1xufTtcblxuLyoqIEZUUCBzZXJ2ZXIgZHVyZHVyICovXG5jb25zdCBzdG9wU2VydmVyOiBIYW5kbGVyID0gKGFyZ3MsIGN0eCkgPT4ge1xuICBjb25zdCBzZXJ2ZXIgPSBjdHguc2VydmVyO1xuICBjb25zdCBjZmcgPSBzZXJ2ZXIuZ2V0UnVudGltZUNvbmZpZygpO1xuICBpZiAoIXNlcnZlci5pc0xpc3RlbmluZygpKSB7XG4gICAgcmV0dXJuIHsgbGluZXM6IFtgJHt5ZWxsb3coJyEnKX0gc2VydmVyIG5vdCBydW5uaW5nYF0gfTtcbiAgfVxuICBzZXJ2ZXIuc3RvcCgpO1xuICByZXR1cm4geyBsaW5lczogW2Ake2dyZWVuKCfinJMnKX0gRlRQIHNlcnZlciBzdG9wcGVkYF0gfTtcbn07XG5cbi8qKiBGVFAgc2VydmVyIHllbmlkZW4gYmHFn2xhdCAqL1xuY29uc3QgcmVzdGFydFNlcnZlcjogSGFuZGxlciA9IChhcmdzLCBjdHgpID0+IHtcbiAgY29uc3Qgc2VydmVyID0gY3R4LnNlcnZlcjtcbiAgY29uc3QgY2ZnID0gc2VydmVyLmdldFJ1bnRpbWVDb25maWcoKTtcbiAgaWYgKHNlcnZlci5pc0xpc3RlbmluZygpKSB7XG4gICAgc2VydmVyLnN0b3AoKTtcbiAgfVxuICBzZXJ2ZXIuc3RhcnQoKTtcbiAgcmV0dXJuIHsgbGluZXM6IFtgJHtncmVlbign4pyTJyl9IEZUUCBzZXJ2ZXIgcmVzdGFydGVkYF0gfTtcbn07XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIERJU1BBVENIRVJcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuY29uc3QgaGFuZGxlcnM6IFJlY29yZDxzdHJpbmcsIEhhbmRsZXI+ID0ge1xuICBoZWxwOiAoYXJncywgX2N0eCkgPT4ge1xuICAgIGlmIChhcmdzWzBdKSBwcmludENvbW1hbmRIZWxwKGFyZ3NbMF0pO1xuICAgIGVsc2UgcHJpbnRIZWxwKCk7XG4gICAgcmV0dXJuIHsgbGluZXM6IFtdIH07XG4gIH0sXG4gIGNsZWFyOiAoKSA9PiAoeyBsaW5lczogW10sIGNsZWFyOiB0cnVlIH0pLFxuICB2ZXJzaW9uOiAoKSA9PiAoeyBsaW5lczogW2xvZ29UaW55KCldIH0pLFxuICBleGl0OiAoKSA9PiAoeyBsaW5lczogW10sIGV4aXQ6IHRydWUgfSksXG4gIHN0YXJ0OiBzdGFydFNlcnZlcixcbiAgc3RvcDogc3RvcFNlcnZlcixcbiAgcmVzdGFydDogcmVzdGFydFNlcnZlcixcbiAgc3RhdHVzLFxuICB3aG9hbWksXG4gIHB3ZCxcbiAgY2QsXG4gIG1rZGlyLFxuICBybSxcbiAgbXYsXG5cbiAgbGlzdDogbGlzdFVzZXJzLFxuICBhZGQ6IGFkZFVzZXIsXG4gIGRlbDogZGVsZXRlVXNlcixcbiAgdXBkYXRlOiB1cGRhdGVVc2VyLFxuXG4gIGNvbmZpZzogY29uZmlnQ29tbWFuZCxcbn07XG5cbi8qKlxuICogQ0xJIGtvbXV0IHNhdMSxcsSxbsSxIGnFn2xlIChpbnRlcmFrdGlmIGtvbXV0bGFyIGBhd2FpdGAgaXN0ZXIpLlxuICogYGhlbHBgL2BjbGVhcmAvYHZlcnNpb25gL2BleGl0YCBzb251w6dsYXLEsSBSRVBMIHRhcmFmxLFuZGFuIHlvcnVtbGFuxLFyXG4gKiAoY2xlYXIgLT4gZWtyYW7EsSBzaWwsIGV4aXQgLT4ga2FidcSfdSBrYXBhdCkuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVGdHBDb21tYW5kKFxuICByYXdMaW5lOiBzdHJpbmcsXG4gIGN0eDogRnRwQ2xpQ29udGV4dCxcbik6IFByb21pc2U8RnRwQ29tbWFuZFJlc3VsdD4ge1xuICBjb25zdCB0b2tlbnMgPSB0b2tlbml6ZSgocmF3TGluZSB8fCAnJykudHJpbSgpKTtcbiAgaWYgKHRva2Vucy5sZW5ndGggPT09IDApIHJldHVybiB7IGxpbmVzOiBbXSB9O1xuXG4gIGNvbnN0IGNvbW1hbmQgPSBmaW5kQ29tbWFuZCh0b2tlbnNbMF0pO1xuICBpZiAoIWNvbW1hbmQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGluZXM6IFtcbiAgICAgICAgYCR7cmVkKCfinJcnKX0gdW5rbm93biBjb21tYW5kOiAke3Rva2Vuc1swXX1gLFxuICAgICAgICBoaW50KCd0eXBlIGhlbHAgdG8gbGlzdCB0aGUgY29tbWFuZHMnKSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVyc1tjb21tYW5kLm5hbWVdO1xuICBpZiAoIWhhbmRsZXIpIHJldHVybiBlcnIoYGNvbW1hbmQgbm90IGltcGxlbWVudGVkOiAke2NvbW1hbmQubmFtZX1gKTtcblxuICB0cnkge1xuICAgIHJldHVybiBhd2FpdCBoYW5kbGVyKHRva2Vucy5zbGljZSgxKSwgY3R4KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIHJldHVybiBlcnIobWVzc2FnZSk7XG4gIH1cbn1cbiJdfQ==