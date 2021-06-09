import type { Logger } from './Logger';
import type { Index, UnknownFunction } from 'ts-runtime-typecheck';
export interface EPI2ME_OPTIONS {
  agent_version: string;
  log: Logger;
  local: boolean;
  endpoint?: string;
  url: string;
  region: string;
  user_agent: string;
  sessionGrace: number;
  uploadTimeout: number;
  uploadRetries: number;
  downloadTimeout: number;
  fileCheckInterval: number;
  downloadCheckInterval: number;
  stateCheckInterval: number;
  inFlightDelay: number;
  waitTimeSeconds: number;
  waitTokenError: number;
  transferPoolSize: number;
  downloadMode: 'data' | 'telemetry' | 'none' | 'data+telemetry';
  filetype: string[];
  signing: boolean;
  sampleDirectory: string;

  // optional values
  useGraphQL?: boolean;
  apikey?: string;
  apisecret?: string;
  id_workflow_instance?: Index;
  debounceWindow?: number;
  proxy?: string;
  jwt?: string;

  // EPI2ME-FS options
  inputFolder?: string;
  inputFolders: string[];
  outputFolder?: string;
  awsAcceleration?: string;
  agent_address?: string;
  telemetryCb?: UnknownFunction;
  dataCb?: UnknownFunction;
  remoteShutdownCb?: UnknownFunction;
}
