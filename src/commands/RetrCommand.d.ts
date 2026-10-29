import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handleRetr(connId: string, conn: FtpConnection, filename: string, userManager: UserManager, controlSocket: any): Promise<CommandResult>;
