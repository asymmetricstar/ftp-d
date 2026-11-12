import { FtpCliContext } from './context';
export interface FtpCommandResult {
    lines: string[];
    clear?: boolean;
    exit?: boolean;
}
export interface CliCommand {
    name: string;
    aliases?: string[];
    group: string;
    usage: string;
    summary: string;
}
export declare const COMMANDS: CliCommand[];
export declare const GROUPS: string[];
export declare function findCommand(name: string): CliCommand | null;
export declare function commandNames(): string[];
export declare function handleFtpCommand(rawLine: string, ctx: FtpCliContext): Promise<FtpCommandResult>;
