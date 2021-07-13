import type { Logger } from './Logger.type';

export interface SocketOptions {
  log: Logger;
  debounceWindow?: number;
  url: string;
}
