import type { Logger } from './Logger.type';

export interface SessionManagerOptions {
  sessionGrace: number;
  log: Logger;
  proxy?: string;
  region?: string;
  useGraphQL?: boolean;
}
