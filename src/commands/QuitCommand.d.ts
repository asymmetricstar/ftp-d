import { FtpConnection, CommandResult } from '../types';
export declare function handleQuit(connId: string, conn: FtpConnection, closeConnection: (connId: string, reason?: string) => void): CommandResult;
