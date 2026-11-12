import { FtpCliContext } from './context';
export interface FtpCommandResult {
    lines: string[];
    clear?: boolean;
    exit?: boolean;
}
export declare function handleFtpCommand(rawLine: string, ctx: FtpCliContext): FtpCommandResult;
