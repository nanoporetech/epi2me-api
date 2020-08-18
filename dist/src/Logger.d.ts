export declare type LogMethod = (...params: unknown[]) => void;
export interface Logger {
    debug: LogMethod;
    error: LogMethod;
    info: LogMethod;
    warn: LogMethod;
}
export declare const NoopLogMethod: LogMethod;
export declare const NoopLogger: Logger;
export declare const FallbackLogger: Logger;
