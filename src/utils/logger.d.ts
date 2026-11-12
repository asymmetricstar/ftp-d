export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
export interface LogRecord {
    level: LogLevel;
    message: string;
    createdAt: string;
}
export type LogSink = (records: LogRecord[]) => void;
export declare function levelsAtLeast(level: string): LogLevel[];
export declare class Logger {
    private static level;
    private static output;
    private static consoleEnabled;
    private static sink;
    private static busyCheck;
    private static queue;
    private static flushTimer;
    static setLevel(level: LogLevel): void;
    static setConsoleOutput(enabled: boolean): void;
    static setOutputCallback(callback: ((message: string, ...args: unknown[]) => void) | null): void;
    static setSink(sink: LogSink | null): void;
    static setBusyCheck(check: (() => boolean) | null): void;
    static getBufferedCount(): number;
    static discardBuffered(): number;
    static flushLogs(force?: boolean): number;
    static debug(message: string, ...args: unknown[]): void;
    static info(message: string, ...args: unknown[]): void;
    static warn(message: string, ...args: unknown[]): void;
    static error(message: string, ...args: unknown[]): void;
    private static emit;
    private static ensureFlushTimer;
}
