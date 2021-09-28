import type { LogMethod, Logger } from './Logger.type';
import type { CoreOptions } from './CoreOptions.type';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import type { Configuration } from './Configuration.type';

import { FallbackLogger } from './Logger';
import { version as VERSION } from '../package.json';
import DEFAULTS from './default_options.json';
import {
  isDictionary,
  asFunction,
  asString,
  asBoolean,
  asOptString,
  asNumber,
  asArrayOf,
  isString,
  asOptIndex,
  asOptFunction,
  asOptArrayOf,
} from 'ts-runtime-typecheck';
import { Duration } from './Duration';

function resolveLogger(log: unknown): Logger {
  if (isDictionary(log)) {
    try {
      return {
        info: asFunction(log.info) as LogMethod,
        debug: asFunction(log.debug) as LogMethod,
        warn: asFunction(log.warn) as LogMethod,
        error: asFunction(log.error) as LogMethod,
        critical: asFunction(log.critical) as Logger['critical'],
      };
    } catch (e) {
      throw new Error('expected log object to have error, debug, info and warn methods');
    }
  } else {
    return FallbackLogger;
  }
}

export function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function parseCoreOptions(opt: Partial<CoreOptions> & { endpoint?: string }): CoreOptions {
  const url = opt.endpoint ?? opt.url ?? DEFAULTS.url;

  return {
    url: url.endsWith('/') ? url.slice(0, -1) : url,
    // Return to calling utils.version when utils no longer signs
    agent_version: asString(opt.agent_version, VERSION),
    log: resolveLogger(opt.log),
    local: asBoolean(opt.local, DEFAULTS.local),

    user_agent: asString(opt.user_agent, DEFAULTS.user_agent),
    signing: asBoolean(opt.signing, DEFAULTS.signing),
    // Optional Values
    apikey: asOptString(opt.apikey),
    apisecret: asOptString(opt.apisecret),
    jwt: asOptString(opt.jwt),
  };
}

export function parseOptions(opt: Partial<EPI2ME_OPTIONS>): Configuration['options'] {
  const downloadMode = asString(opt.downloadMode, DEFAULTS.downloadMode);

  switch (downloadMode) {
    case 'data':
    case 'telemetry':
    case 'none':
    case 'data+telemetry':
      break;
    default:
      throw new Error(`Invalid downloadMode ${downloadMode}`);
  }

  const options = {
    ...parseCoreOptions(opt),
    region: asString(opt.region, DEFAULTS.region),
    sessionGrace: Duration.Seconds(asNumber(opt.sessionGrace, DEFAULTS.sessionGrace)),
    uploadTimeout: Duration.Seconds(asNumber(opt.uploadTimeout, DEFAULTS.uploadTimeout)),
    uploadRetries: asNumber(opt.uploadRetries, DEFAULTS.uploadRetries),
    downloadTimeout: Duration.Seconds(asNumber(opt.downloadTimeout, DEFAULTS.downloadTimeout)),
    fileCheckInterval: Duration.Seconds(asNumber(opt.fileCheckInterval, DEFAULTS.fileCheckInterval)),
    downloadCheckInterval: Duration.Seconds(asNumber(opt.downloadCheckInterval, DEFAULTS.downloadCheckInterval)),
    stateCheckInterval: Duration.Seconds(asNumber(opt.stateCheckInterval, DEFAULTS.stateCheckInterval)),
    inFlightDelay: Duration.Seconds(asNumber(opt.inFlightDelay, DEFAULTS.inFlightDelay)),
    waitTimeSeconds: Duration.Seconds(asNumber(opt.waitTimeSeconds, DEFAULTS.waitTimeSeconds)),
    waitTokenError: asNumber(opt.waitTokenError, DEFAULTS.waitTokenError),
    transferPoolSize: asNumber(opt.transferPoolSize, DEFAULTS.transferPoolSize),
    downloadMode,
    filetype: asArrayOf(isString)(opt.filetype, DEFAULTS.filetype),
    sampleDirectory: asString(opt.sampleDirectory, DEFAULTS.sampleDirectory),
    // optional values
    useGraphQL: asBoolean(opt.useGraphQL, false),
    idWorkflowInstance: asOptIndex(opt.id_workflow_instance),
    idDataset: asOptIndex(opt.id_dataset),
    debounceWindow: Duration.Seconds(asNumber(opt.debounceWindow, DEFAULTS.debounceWindow)),
    proxy: asOptString(opt.proxy),
    // EPI2ME-FS options
    inputFolders: asOptArrayOf(isString)(opt.inputFolders),
    outputFolder: asOptString(opt.outputFolder),
    awsAcceleration: asOptString(opt.awsAcceleration),
    agent_address: asOptString(opt.agent_address),
    telemetryCb: asOptFunction(opt.telemetryCb),
    dataCb: asOptFunction(opt.dataCb),
    remoteShutdownCb: asOptFunction(opt.remoteShutdownCb),
  };

  if (opt.inputFolder) {
    if (!options.inputFolders) {
      options.inputFolders = [];
    }
    options.inputFolders.push(asString(opt.inputFolder));
  }

  return options;
}
