import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handleRnfr(connId: string, conn: FtpConnection, filename: string, userManager: UserManager): Promise<CommandResult>;
