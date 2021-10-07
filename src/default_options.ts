import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import { FallbackLogger } from './Logger';
import { version as VERSION } from '../package.json';

export const DEFAULT_OPTIONS: EPI2ME_OPTIONS = {
  local: false,
  url: 'https://epi2me.nanoporetech.com',
  region: 'eu-west-1',
  sessionGrace: 5,
  uploadTimeout: 1200,
  uploadRetries: 10,
  downloadTimeout: 1200,
  debounceWindow: 2000,
  fileCheckInterval: 5,
  downloadCheckInterval: 3,
  stateCheckInterval: 60,
  inFlightDelay: 600,
  waitTimeSeconds: 20,
  waitTokenError: 30,
  transferPoolSize: 3,
  downloadMode: 'data+telemetry',
  filetype: ['.fastq', '.fq', '.fastq.gz', '.fq.gz'],
  signing: true,
  sampleDirectory: '/data',
  log: FallbackLogger,
  agent_version: VERSION,
};
