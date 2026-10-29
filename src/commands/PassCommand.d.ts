import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handlePass(connId: string, conn: FtpConnection, password: string, userManager: UserManager): Promise<CommandResult>;
