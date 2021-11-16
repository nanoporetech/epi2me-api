import type { Logger } from './Logger.type';

export interface CoreOptions {
  url: string;
  apikey?: string;
  apisecret?: string;
  agent_version: string;
  jwt?: string;
  proxy?: string;
  local: boolean;
  log: Logger;
  signing: boolean;
}
