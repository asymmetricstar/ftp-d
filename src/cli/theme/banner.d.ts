export interface ShellInfo {
    server?: string;
    user?: string | null;
    commands?: string;
    banner?: string;
    logs?: string;
}
export declare function shellBanner(info?: ShellInfo): string;
export declare const PROMPT_COLOR: (text: string) => string;
