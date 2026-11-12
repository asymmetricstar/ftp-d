import type { FtpServer } from '../core/FtpServer';
import type { ShellInfo } from './theme/banner.js';
export declare function startShell(server: FtpServer, info?: ShellInfo): Promise<void>;
