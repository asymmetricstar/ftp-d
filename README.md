# ftpd-lite

An FTP server with multiple users and permission control, written in Node.js + TypeScript.
It is imported as a library (`require`/`import`), and the port listening process starts when you call `start()`.

## Installation

```bash
npm install ftpd-lite
```

## Quick Start

```js
const { FtpServer } = require('ftpd-lite');

const server = new FtpServer({
  port: 21,
  dataPort: 20,
  userFile: './users.json',
  maxConnections: 100,
  logLevel: 'info',

  // 220 welcome message (banner).
  // If left empty, it automatically writes "<port> FTP Server Ready".
  banner: '',

  // PASV (passive mode) data connection ports are selected from this range.
  // It must be the same as the range that needs to be opened in the firewall.
  passivePortRange: { min: 50000, max: 50050 },
});

server.start();
```

TypeScript:

```ts
import { FtpServer, type ServerConfig } from 'ftpd-lite';

const config: ServerConfig = {
  port: 21,
  dataPort: 20,
  userFile: './users.json',
  maxConnections: 100,
  logLevel: 'info',
  banner: 'My FTP Server',
  passivePortRange: { min: 50000, max: 50050 },
};

new FtpServer(config).start();
```

## Settings

| Field | Default | Description |
| --- | --- | --- |
| `port` | `21` | Control (command) port |
| `dataPort` | `20` | Classic data port |
| `userFile` | `<package>/users.json` | Path to the user file (JSON) |
| `maxConnections` | `100` | Maximum number of open connections at the same time |
| `logLevel` | `'info'` | `debug` \| `info` \| `warn` \| `error` |
| `banner` | `''` | 220 welcome message; if empty, `"<port> FTP Server Ready"` |
| `passivePortRange` | `{ min: 50000, max: 50050 }` | Range from which PASV data ports will be selected (fallback) |

If an invalid `passivePortRange` is provided, a warning is logged and the default range is used.

## User file (`users.json`)

```json
{
  "users": [
    {
      "username": "admin",
      "password": "admin123",
      "homeDir": "./files/admin",
      "permissions": {
        "read": true,
        "write": true,
        "list": true,
        "create": true,
        "delete": true,
        "mkd": true,
        "rmdir": true,
        "rename": true
      },
      "isActive": true
    }
  ],
  "lastUpdated": "2026-10-29T12:30:00.000Z"
}
```

`homeDir` is the user's virtual root: the client always sees it as `/` and
the client cannot go outside this directory (CWD/RETR/STOR/DELE/MKD/RMD/RNFR/RNTO are checked).

## Supported commands

`USER`, `PASS`, `QUIT`, `NOOP`, `PWD`, `CWD`, `LIST`, `NLST`, `RETR`, `STOR`, `DELE`,
`MKD`, `RMD`, `RNFR`, `RNTO`, `PASV`, `PORT`, `TYPE`, `SYST`, `FEAT`

> TLS/SSL (`AUTH TLS`), `MLSD`/`MLST`, `SIZE` and `MDTM` are not yet implemented and
> are not advertised in the `FEAT` response.

## Development in this repository

```bash
npm run type-check   # tsc --noEmit
npm run build        # src -> npm_build (index.js + index.d.ts)
npm start            # runs the example server examples/basic.js
npm test             # test client test/ftp-client.js
```

To see the package contents before publishing:

```bash
npm pack --dry-run
```

## License

MIT
