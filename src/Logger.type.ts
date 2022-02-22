export type LogMethod = (...params: unknown[]) => void;

export interface Logger {
  debug: LogMethod;
  error: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  critical(id: CriticalErrorId, reason: string): void;
}

export type CriticalErrorId = 'UNKNOWN' | 'FS_FAILURE' | 'PROFILE_PERSIST' | 'UNAUTHENTICATED' | 'CLOCK_OFFSET';
