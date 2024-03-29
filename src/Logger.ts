import type { CriticalErrorId, Logger, LogMethod } from './Logger.type';

export const NoopLogMethod: LogMethod = () => {};

export const NoopLogger: Logger = {
  debug() {},
  error() {},
  info() {},
  warn() {},
  critical() {},
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
  critical(id: CriticalErrorId, reason: string): void {
    console.error(`[${new Date().toISOString()}] CRITICAL: ${id}`, reason);
  },
};
