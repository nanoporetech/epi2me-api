export type LogMethod = (...params: unknown[]) => void;

export interface Logger {
  debug: LogMethod;
  error: LogMethod;
  info: LogMethod;
  warn: LogMethod;
}

export const NoopLogMethod: LogMethod = (...args: unknown[]): void => { (args) };

export const NoopLogger: Logger = {
  debug: NoopLogMethod,
  error: NoopLogMethod,
  info: NoopLogMethod,
  warn: NoopLogMethod,
};

export const FallbackLogger: Logger = {
  info(...args: unknown[]): void {
    console.info(`[${new Date().toISOString()}] INFO:`, ...args);
  },
  debug(...args: unknown[]): void {
    console.debug(`[${new Date().toISOString()}] DEBUG:`, ...args);
  },
  warn(...args: unknown[]): void {
    console.warn(`[${new Date().toISOString()}] WARN:`, ...args);
  },
  error(...args: unknown[]): void {
    console.error(`[${new Date().toISOString()}] ERROR:`, ...args);
  },
};