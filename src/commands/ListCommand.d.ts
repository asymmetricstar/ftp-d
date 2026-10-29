import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function buildDirectoryListing(directory: string): Promise<string>;
export declare function handleList(connId: string, conn: FtpConnection, userManager: UserManager, controlSocket: any): Promise<CommandResult>;
