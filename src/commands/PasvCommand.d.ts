import { FtpConnection, CommandResult } from '../types';
export declare function handlePasv(connId: string, conn: FtpConnection, passiveIp: string, dynamicPort: number): CommandResult;
