# ftpd-lite
![NPM Downloads](https://img.shields.io/npm/dw/ftpd-lite) ![Docker Pulls](https://img.shields.io/docker/pulls/asymmetricstar/docker-ftpd)

Simple and lightweight FTP server written in Node.js + TypeScript.

`ftpd-lite` works in two ways:

- **as a module** — `require` / `import` it in your project and control the server from code
- **as a binary** — `ftpd` for the interactive terminal, `ftpd --headless` for a plain server process

* multiple users
* permission control
* passive port support
* HTTP management API (accounts + logs)
* interactive CLI and headless mode

## Requirements

- Node.js 22.5+ (uses the built-in `node:sqlite` module)

## Installation

```bash
npm i -g ftpd-lite
```

## Module usage

The package is imported as a library (`require` / `import`). The listening process starts when you call `start()`.

```js
const { FtpServer } = require('ftpd-lite');

const server = new FtpServer({
  dbPath: './ftpd.db', // SQLite database (users + settings + logs tables)
  banner: '',
  logLevel: 'info',
});

server.start(() => {
  console.log(`FTP server ready on ${server.getListenAddress()}`);
});
```

TypeScript:

```ts
import { FtpServer, Logger, LogLevel, type ServerConfig } from 'ftpd-lite';

const config: ServerConfig = {
  dbPath: './ftpd.db',
  banner: 'My FTP Server',
  logLevel: 'info',
};

const server = new FtpServer(config);

// Library default: records also go to the console. Silence them and read them
// from the SQLite `logs` table instead (the `ftpd` binary does this for you).
Logger.setConsoleOutput(false);
Logger.setLevel(LogLevel.DEBUG);

server.start();
```

## Binary usage

### Interactive terminal

```bash
npx ftpd
```

```
  μFtp ━━━━ ●
       ┣━━━ ●   ftpd-lite  v1.0.16
       ┗━━━ ●   lightweight ftp server

  # server    192.168.1.101:21
  # commands  [USER, PASS, CWD, PWD, LIST, RETR, STOR, DELE, QUIT, NOOP]
  # banner    21 FTP Server Ready
  # logs      http://localhost:3001/logs

  ✓ ready · type help to list the commands

admin@ftpd:
```

### Headless

```bash
npx ftpd --headless
```

No terminal is opened. The server prints exactly one line and keeps running:

```
server ready 192.168.1.101:21
```

Nothing else is printed: records go to the SQLite `logs` table and the HTTP API.
`SIGINT` / `SIGTERM` stop the server cleanly (buffered records are flushed first).
The API port can be changed with `FTPD_API_PORT` (default `3001`).

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
| `ftp.passiveIp` | `(auto)` | Address advertised in the `227` reply |
| `ftp.ip` | `(auto)` | Interface the server binds to |

If an invalid `passivePortRange` is provided, a warning is logged and the default range is used.


## Logs

Server logs are not printed to the terminal; they are written to the `logs` table and read
through the HTTP API.

**Write priority:** FTP work always comes first. Records are buffered in memory and written to
SQLite in a single transaction only while no command or transfer is running, so log writes never
compete with user traffic. `GET /logs` reports the number of records still waiting in memory as `pending`.

## HTTP API

The `ftpd` binary serves this API on `http://localhost:3001` (`FTPD_API_PORT` changes the port).

| Method & path | Description |
| --- | --- |
| `GET /logs` | Log records (query: `limit`, `since`, `level`, `format`) |
| `DELETE /logs` | Clear the `logs` table (memory buffer included) |
| `GET /users` | List accounts |
| `POST /users` | Add account (JSON: `{username, password, homeDir?, permissions?}`) |
| `PUT /users/:name` | Update account (JSON: `{password?, home?, perm?}`) |
| `DELETE /users/:name` | Delete account and its home directory |

```bash
curl "http://localhost:3001/logs?format=text&limit=50"
curl "http://localhost:3001/logs?since=120"   # only new records
```

## Supported FTP commands

`USER`, `PASS`, `QUIT`, `NOOP`, `PWD`, `CWD`, `LIST`, `NLST`, `RETR`, `STOR`, `DELE`,
`MKD`, `RMD`, `RNFR`, `RNTO`, `PASV`, `PORT`, `TYPE`, `SYST`, `FEAT`

> TLS/SSL (`AUTH TLS`), `MLSD`/`MLST`, `SIZE` and `MDTM` are not yet implemented and
> are not advertised in the `FEAT` response.


### Files

All paths are resolved inside the account home directory (the shell is chrooted like an FTP client).
Operations check the account's Linux permissions (`rwxr-xr-x`).

| Command | Description |
| --- | --- |
| `ls [path]` (`dir`) | List a directory |
| `pwd` | Print the working directory |
| `cd <path>` | Change directory |
| `mkdir <dir>` | Create a directory (needs `w`) |
| `rm [-r] <path>` (`remove`) | Remove a file or directory (needs `w`) |
| `mv <src> <dst>` (`rename`) | Rename or move (needs `w`) |

### Users

Bare `list` (or `users`) prints the accounts table. `add`, `del` and `update` prompt for missing
fields through the shell prompt (passwords are not echoed):

```text
admin@ftpd: list
USER              STATUS      PERMS  HOME
────────────────  ──────────  ─────────  ────────────────────
anonymous         active      r-xr-xr-x  F:\project

admin@ftpd: add --username alice --password secret --home ./alice --perm rwxr-xr-x
✓ user alice created
  home  F:\project\alice
  perms rwxr-xr-x

admin@ftpd:
```

Without flags (`admin@ftpd: add`), the shell asks for `Username`, `Password` and
`Home [./]`, then prints an interactive permission table.

| Command | Description |
| --- | --- |
| `list` (`users`) | Print the accounts table |
| `add --username <name> --password <pass> [--home <dir>] [--perm <rwxr-xr-x>]` (`useradd`) | Create an account |
| `del --username <name>` (`userdel`) | Delete an account and its home directory |
| `update --username <name> [--password x] [--home x] [--new-username x] [--perm rwxr-xr-x] [--enable\|--disable]` | Update password, home, username, permissions or status |

### Config

Settings live in the SQLite `settings` table and can be edited from the shell.
Bare `config` opens an interactive selection menu (values are prompted with their
current value in `[brackets]`; `logLevel` is a numbered choice). The last entry before
**Back** clears the log table after a `[y/n]` confirmation:

```text
admin@ftpd: config
  [1] port              21 *
  [2] dataPort          20 *
  ...
  [9] dbPath            ./ftpd.db (read-only)
  [10] Clear logs        142 rows
  [11] Back

Select an option [1-11]: 4
    [1] debug
    [2] info
    [3] warn
    [4] error

  logLevel [1-4] (Enter keeps current): 2
✓ logLevel = info

admin@ftpd: config
Select an option [1-11]: 10
Delete all 142 log records? [y/n]: y
✓ logs cleared (142 rows deleted)
```

| Command | Description |
| --- | --- |
| `config` | Interactive settings menu (includes **Clear logs**) |
| `config show` | Print all settings (`*` = restart required) |
| `config get <key>` | Print one setting |
| `config set <key> <value>` | Update and persist a setting |
| `config unset <key>` | Remove a setting (default is used after restart) |
| `config path` | Database, tables and history file locations |

```text
admin@ftpd: config set port 2121
✓ port = 2121 · restart required and applied
admin@ftpd: config set logLevel debug
✓ logLevel = debug
admin@ftpd: update --username anonymous --perm rwxr-xr-x
✓ anonymous: perm -> rwxr-xr-x
```
