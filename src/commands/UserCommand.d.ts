import { FtpConnection, CommandResult } from '../types';
import { UserManager } from '../userManager';
export declare function handleUser(connId: string, conn: FtpConnection, username: string, userManager: UserManager): Promise<CommandResult>;
