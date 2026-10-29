import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handleMkd(connId: string, conn: FtpConnection, dirPath: string, userManager: UserManager): Promise<CommandResult>;
