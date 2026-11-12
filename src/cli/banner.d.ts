export interface FtpPromptInfo {
    user: string | null;
    currentDir: string;
}
export declare function renderFtpPrompt(info: FtpPromptInfo): string;
export declare function renderFtpBanner(port: number): string;
