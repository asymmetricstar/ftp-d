import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handleRnto(connId: string, conn: FtpConnection, newFilename: string, userManager: UserManager): Promise<CommandResult>;
