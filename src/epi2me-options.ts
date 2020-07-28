import { Logger } from "./Logger";

export interface EPI2ME_OPTIONS {
  log: Logger;
  local: boolean;
  url: string;
  region: string;
  user_agent: string;
  sessionGrace: number;
  uploadTimeout: number;
  downloadTimeout: number;
  fileCheckInterval: number;
  downloadCheckInterval: number;
  stateCheckInterval: number;
  inFlightDelay: number;
  waitTimeSeconds: number;
  waitTokenError: number;
  transferPoolSize: number;
  downloadMode: string;
  filetype: string[];
  signing: boolean;
  sampleDirectory: string;

  // optional values
  useGraphQL?: boolean;
  apikey?: string;
  apisecret?: string;
  id_workflow_instance?: number;
  debounceWindow?: number;
  proxy?: string;

  // EPI2ME-FS options
  inputFolders: string[];
  outputFolder?: string;
  awsAcceleration?: string;
  agent_address?: string;
}