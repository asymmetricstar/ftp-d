import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handleDele(connId: string, conn: FtpConnection, filename: string, userManager: UserManager): Promise<CommandResult>;
