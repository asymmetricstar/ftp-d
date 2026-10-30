import * as net from 'net';
export declare enum ReplyCode {
    CONTINUE = 125,
    DATA_CONNECT = 150,
    OK = 200,
    USER_OK = 230,
    PASS_OK = 230,
    SYS_NAME = 211,
    SYS_TYPE = 215,
    FEAT_OK = 211,
    RETR_OK = 226,
    STOR_OK = 226,
    DELE_OK = 250,
    RMD_OK = 250,
    MKD_OK = 257,
    LIST_OK = 150,
    LIST_END = 226,
    NOOP_OK = 200,
    QUIT_OK = 221,
    CWD_OK = 250,
    PWD_OK = 257,
    REST_OK = 350,
    USER_PASS = 331,
    PASS_ACC = 332,
    USER_ACC = 332,
    REST_NEW = 350,
    USER_ERR = 503,
    PASS_ERR = 503,
    CMD_ERR = 500,
    SYNTAX_ERR = 501,
    PARAM_ERR = 502,
    BAD_SEQ = 503,
    NO_SUCH_USER = 530,
    NOT_LOGGED = 530,
    WRITE_PROTECT = 451,
    CANNOT_OPEN_DATA = 425,
    TRANSFER_ABORTED = 426,
    INTERNAL_ERR = 500,
    BAD_CMD = 502,
    BAD_USER = 530,
    NOT_ALLOWED = 550,
    FILE_NOT_FOUND = 550,
    PATH_EXISTS = 550,
    NO_PERMISSION = 550,
    DIRECTORY_EXISTS = 550,
    FILE_EXISTS = 550,
    SYST_OK = 215,
    BAD_ADDRESS = 421,
    TIMEOUT = 421,
    SERVICE_NOT_AVAILABLE = 421
}
export type Permission = 'read' | 'write' | 'list' | 'create' | 'append' | 'delete' | 'chmod' | 'mkd' | 'rmdir' | 'rename' | 'deletemyfiles' | 'nopasswd' | 'passive' | 'port' | 'nonlocalbind' | 'private' | 'tls';
export interface UserPermissions {
    read?: boolean;
    write?: boolean;
    list?: boolean;
    create?: boolean;
    append?: boolean;
    delete?: boolean;
    chmod?: boolean;
    mkd?: boolean;
    rmdir?: boolean;
    rename?: boolean;
    deletemyfiles?: boolean;
    nopasswd?: boolean;
    passive?: boolean;
    port?: boolean;
    nonlocalbind?: boolean;
    private?: boolean;
    tls?: boolean;
}
export interface FtpConnection {
    socket: net.Socket;
    user: string | null;
    pass: string | null;
    homeDir: string;
    currentDir: string;
    permissions: UserPermissions;
    transferMode: 'ascii' | 'binary' | null;
    transferSize: number;
    lastReply: number;
    lastMessage: string;
    rnfrPath?: string | null;
    dataMode?: 'passive' | 'active';
    activeDataTarget?: {
        ip: string;
        port: number;
    };
}
export interface User {
    username: string;
    password: string;
    homeDir: string;
    permissions: UserPermissions;
    isActive: boolean;
}
export interface UserManagerData {
    users: User[];
    lastUpdated: string;
}
export interface DataConnection {
    socket: net.Socket;
    passive: boolean;
    localPort: number;
    state: 'listening' | 'connecting' | 'connected' | 'closing' | 'closed';
}
export interface CommandResult {
    code: number;
    message: string;
    data?: unknown;
}
export type CommandHandler = (conn: FtpConnection, args: string) => Promise<CommandResult>;
export interface ServerConfig {
    port: number;
    dataPort: number;
    userFile: string | UserManagerData;
    maxConnections: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    banner: string;
    passivePortRange: {
        min: number;
        max: number;
    };
    passiveIp?: string;
}
export interface TransferStatus {
    file: string;
    state: 'pending' | 'transferring' | 'complete' | 'failed';
    size: number;
    transferred: number;
    mode: 'ascii' | 'binary';
    timestamp: string;
}
