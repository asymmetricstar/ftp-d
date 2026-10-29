export declare function normalizeDirPath(dirPath: string): string;
export declare function robustPathNormalize(dirPath: string): string;
export declare function isPathWithinHome(targetPath: string, homeDir: string): boolean;
export declare function ensureDirectoryExists(dirPath: string): Promise<void>;
export declare function getFullPath(baseDir: string, filePath: string): string;
export declare function resolveFtpPath(targetPath: string, currentDir: string, homeDir: string): string;
export declare function toVirtualPath(fsPath: string, homeDir: string): string;
