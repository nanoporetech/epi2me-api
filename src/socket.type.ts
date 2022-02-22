import type { Duration } from './Duration';
import type { Logger } from './Logger.type';

export interface SocketOptions {
  log: Logger;
  debounceWindow: Duration;
  url: string;
}
