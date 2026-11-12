import { FtpServer } from '../core/FtpServer';
interface UserApiConfig {
    ftpServer: FtpServer;
    port?: number;
}
export declare class UserApi {
    private httpServer;
    private port;
    private userManager;
    private ftpServer;
    constructor(config: UserApiConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private requestHandler;
    private listLogs;
    private clearLogs;
    private listUsers;
    private addUser;
    private deleteUser;
    private updateUser;
}
export declare function startUserApi(ftpServer: FtpServer, port?: number): Promise<UserApi>;
export {};
