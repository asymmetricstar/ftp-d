# ftpd-lite
![NPM Downloads](https://img.shields.io/npm/dw/ftpd-lite) ![Docker Pulls](https://img.shields.io/docker/pulls/asymmetricstar/docker-ftpd)

Simple and lightweight FTP server written in Node.js + TypeScript.
* multiple users
* permission control
* passive port support
* SQLite persistence (`ftpd.db`)

## Installation

```bash
npm install ftpd-lite
```

## Quick Start

The package is imported as a library (`require` / `import`). The listening process starts when you call `start()`.

```js
const { FtpServer } = require('ftpd-lite');

const server = new FtpServer({
  dbPath: './ftpd.db', // SQLite database (users + settings tables)
  banner: '',
  logLevel: 'info',
});

server.start();
```

TypeScript:

```ts
import { FtpServer, type ServerConfig } from 'ftpd-lite';

const config: ServerConfig = {
  dbPath: './ftpd.db',
  banner: 'My FTP Server',
  logLevel: 'info',
};

new FtpServer(config).start();
```

## Configuration

Only `dbPath`, `banner` and `logLevel` are part of the public `ServerConfig`.
All other settings are read from the SQLite `settings` table.

| Key | Default | Description |
| --- | --- | --- |
| `ftp.port` | `21` | Control (command) port |
| `ftp.dataPort` | `20` | Classic data port |
| `ftp.maxConnections` | `100` | Maximum number of open connections at the same time |
| `ftp.logLevel` | `'info'` | `debug` \| `info` \| `warn` \| `error` |
| `ftp.banner` | `''` | 220 welcome message; if empty, `"<port> FTP Server Ready"` |
| `ftp.passivePortRange` | `'50000:50050'` | PASV range as `min:max` |

If an invalid `passivePortRange` is provided, a warning is logged and the default range is used.

## Database

The server stores all data in a SQLite database file (default: `./ftpd.db`).

- `users` table: user credentials, home directory and permissions (Linux style, e.g. `rwxr-xr-x`).
- `settings` table: server settings (`ftp.*` keys).

## User

Users are persisted in the SQLite `users` table.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  homeDir TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '{}',
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Supported commands

`USER`, `PASS`, `QUIT`, `NOOP`, `PWD`, `CWD`, `LIST`, `NLST`, `RETR`, `STOR`, `DELE`,
`MKD`, `RMD`, `RNFR`, `RNTO`, `PASV`, `PORT`, `TYPE`, `SYST`, `FEAT`

> TLS/SSL (`AUTH TLS`), `MLSD`/`MLST`, `SIZE` and `MDTM` are not yet implemented and
> are not advertised in the `FEAT` response.

## CLI / Interactive terminal

The `ftpd` binary starts the server and opens an interactive shell. Startup logs are
cleared before the banner is drawn, so the prompt is ready immediately:

```bash
npx ftpd

  μFtp ━━━━ ●
       ┣━━━ ●   FTP-LITE  v0.0.2
       ┗━━━ ●   lightweight ftp server

  # server    192.168.1.101:21
  # commands  [USER, PASS, CWD, PWD, LIST, RETR, STOR, DELE, QUIT, NOOP]
  # banner    21 FTP Server Ready

  ✓ ready · type help to list the commands

anonim@ftpd: 
```

The prompt is `account@ftpd:` (primary colour `#7CFC00`) and the shell has history (`↑↓`),
tab completion, quoted arguments (`add bob "my pass"`) and `help <command>` for per-command usage.

### Session

| Command | Description |
| --- | --- |
| `help [command]` | Show help, or usage of one command |
| `clear` | Clear the screen |
| `version` | Show version |
| `status` | Server state, ports, connections, session |
| `whoami` | Current account, home and permissions |
| `exit` (`quit`, `q`, `:q`) | Stop the server and leave the shell |

### Files

All paths are resolved inside the account home directory (shell is chrooted like an FTP client).
Operations check the account's Linux permissions (`rwxr-xr-x`).

| Command | Description |
| --- | --- |
| `ls [path]` | List a directory |
| `pwd` | Print the working directory |
| `cd <path>` | Change directory |
| `mkdir <dir>` | Create a directory (needs `w`) |
| `touch <file>` | Create an empty file (needs `w`) |
| `rm [-r] <path>` | Remove a file or directory (needs `w`) |
| `mv <src> <dst>` | Rename or move (needs `w`) |
| `cat <file>` | Print a text file (needs `r`) |

### Users

Bare `list` (or `users`) prints the accounts table directly. Bare `user` opens an
interactive menu, same style as `config`; each step asks for its input through the
shell prompt (passwords are not echoed). The menu runs one action and returns to
the prompt (only an invalid option asks again):

```text
anonim@ftpd: list
USER              STATUS      PERMS  HOME
────────────────  ──────────  ─────────  ────────────────────
anonim            active      r-xr-xr-x  F:\project

anonim@ftpd: user
  [1] List accounts
  [2] Add account
  [3] Delete account
  [4] Update account
  [5] Back

Select an option [1-5]: 2
  Username: alice
  Password: ****
  Home [F:\project]: 
  Permissions [rwxr-xr-x]: 
✓ user alice created

anonim@ftpd: 
```

Enable/disable lives inside **Update account** (prompt: `Status [enable/disable]`).

| Command | Description |
| --- | --- |
| `list` (`users`) | Print the accounts table |
| `user` | Interactive accounts menu |
| `user list` / `list table` | Print the accounts table (subcommand style) |
| `add <name> <password> [home] [rwxr-xr-x]` (`useradd`) | Create an account |
| `del <name>` (`userdel`) | Delete an account |
| `update <name> [--password x] [--home x] [--username x] [--perm rwxr-xr-x] [--enable\|--disable]` | Update password, home, username, permissions or status |

Subcommand style (`user ...`) also works: `user passwd`, `user enable`, `user disable`,
`user perm <name> <rwxr-xr-x>`.

### Config

Settings live in the SQLite `settings` table and can be edited from the shell.
Bare `config` opens an interactive selection menu (values are prompted with their
current value in `[brackets]`; `logLevel` is a numbered choice). One selection is
applied and the shell returns to the prompt:

```text
anonim@ftpd: config
  [1] port              21 *
  [2] dataPort          20 *
  ...
  [10] Back

Select an option [1-10]: 4
    [1] debug
    [2] info
    [3] warn
    [4] error

  logLevel [1-4] (Enter keeps current): 2
✓ logLevel = info

anonim@ftpd: 
```

| Command | Description |
| --- | --- |
| `config` | Interactive settings menu |
| `config show` | Print all settings (`*` = restart required) |
| `config get <key>` / `get <key>` | Print one setting |
| `config set <key> <value>` / `set <key> <value>` | Update and persist a setting |
| `config unset <key>` | Remove a setting (default is used after restart) |
| `config path` | Database and history file locations |

```text
anonim@ftpd: set port 2121
✓ port = 2121 · restart required
anonim@ftpd: set logLevel debug
✓ logLevel = debug
anonim@ftpd: update anonim --perm rwxr-xr-x
✓ anonim: perm -> rwxr-xr-x
```
