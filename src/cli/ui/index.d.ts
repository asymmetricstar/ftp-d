import { faint, dim, bold, red, green, yellow, cyan, visibleWidth, box, accentGreen } from '../theme/palette.js';
export { faint, dim, bold, red, green, yellow, cyan, visibleWidth, box, accentGreen };
export declare function ok(message: string): void;
export declare function info(message: string): void;
export declare function warn(message: string): void;
export declare function fail(message: string): never;
export declare function printJson(value: unknown): void;
export interface PromptHandlers {
    ask(question: string): Promise<string>;
    askSecret(question: string): Promise<string>;
}
export declare function usePromptHandlers(handlers: PromptHandlers | null): void;
export declare function ask(question: string): Promise<string>;
export declare function askSecret(question: string): Promise<string>;
export declare function confirm(question: string, fallback?: boolean): Promise<boolean>;
export declare function table(headers: string[], rows: string[][]): string;
export declare function formatDate(iso: string | undefined): string;
