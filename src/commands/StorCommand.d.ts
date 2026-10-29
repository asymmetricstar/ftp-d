import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handleStor(connId: string, conn: FtpConnection, filename: string, userManager: UserManager, controlSocket: any): Promise<CommandResult>;
