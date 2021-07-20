import type { Logger } from './Logger.type';

export interface CoreOptions {
  url: string;
  apikey?: string;
  apisecret?: string;
  agent_version: string;
  jwt?: string;
  local: boolean;
  log: Logger;
  user_agent: string;
  signing: boolean;
}
