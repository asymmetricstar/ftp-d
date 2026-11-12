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

The `ftpd` binary starts an interactive FTP terminal:

```bash
npx ftpd
$: ftpd
```
