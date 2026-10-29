export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
export declare class Logger {
    private static level;
    static setLevel(level: LogLevel): void;
    static debug(message: string, ...args: unknown[]): void;
    static info(message: string, ...args: unknown[]): void;
    static warn(message: string, ...args: unknown[]): void;
    static error(message: string, ...args: unknown[]): void;
}
