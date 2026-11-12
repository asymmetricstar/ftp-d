import { FtpServer } from '../core/FtpServer';
import { FtpConnection } from '../types';
export interface FtpCliContext {
    server: FtpServer;
    user: string | null;
    homeDir: string;
    currentDir: string;
    connection: FtpConnection | null;
}
export declare function createFtpContext(server: FtpServer): FtpCliContext;
