import { FtpConnection } from './types';
export declare class FileTransfer {
    private userManager;
    constructor();
    private getUserManager;
    private checkPermission;
    uploadFile(conn: FtpConnection, remotePath: string, data: Buffer): Promise<void>;
    downloadFile(conn: FtpConnection, remotePath: string): Promise<void>;
    deleteFile(conn: FtpConnection, remotePath: string): Promise<void>;
    createDirectory(conn: FtpConnection, remotePath: string): Promise<void>;
    removeDirectory(conn: FtpConnection, remotePath: string): Promise<void>;
    renameFile(conn: FtpConnection, oldPath: string, newPath: string): Promise<void>;
    changeFileMode(conn: FtpConnection, remotePath: string, mode: number): Promise<void>;
}
export declare const fileTransfer: FileTransfer;
