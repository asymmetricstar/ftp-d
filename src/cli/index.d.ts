import { FtpServer } from '../core/FtpServer';
import type { ShellInfo } from './theme/banner.js';
export type FtpShellInfo = ShellInfo;
export declare function startInteractiveShell(server: FtpServer, info?: FtpShellInfo): Promise<void>;
export declare function isInteractive(): boolean;
