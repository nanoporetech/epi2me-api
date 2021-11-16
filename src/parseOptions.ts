import type { LogMethod, Logger } from './Logger.type';
import type { CoreOptions } from './CoreOptions.type';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import type { Configuration } from './Configuration.type';

import { FallbackLogger } from './Logger';
import { DEFAULT_OPTIONS } from './default_options';
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
import { NestedError } from './NodeError';

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
    } catch (err) {
      throw new NestedError('expected log object to have error, warn, debug, info and critical methods', err);
    }
  } else {
    return FallbackLogger;
  }
}

export function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function parseCoreOptions(opt: Partial<CoreOptions> & { endpoint?: string }): CoreOptions {
  const url = opt.endpoint ?? opt.url ?? DEFAULT_OPTIONS.url;

  return {
    url: url.endsWith('/') ? url.slice(0, -1) : url,
    agent_version: asString(opt.agent_version, DEFAULT_OPTIONS.agent_version),
    log: resolveLogger(opt.log),
    local: asBoolean(opt.local, DEFAULT_OPTIONS.local),

    signing: asBoolean(opt.signing, DEFAULT_OPTIONS.signing),
    // Optional Values
    proxy: asOptString(opt.proxy),
    apikey: asOptString(opt.apikey),
    apisecret: asOptString(opt.apisecret),
    jwt: asOptString(opt.jwt),
  };
}

export function parseOptions(opt: Partial<EPI2ME_OPTIONS>): Configuration['options'] {
  const downloadMode = asString(opt.downloadMode, DEFAULT_OPTIONS.downloadMode);

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
    region: asString(opt.region, DEFAULT_OPTIONS.region),
    sessionGrace: Duration.Seconds(asNumber(opt.sessionGrace, DEFAULT_OPTIONS.sessionGrace)),
    uploadTimeout: Duration.Seconds(asNumber(opt.uploadTimeout, DEFAULT_OPTIONS.uploadTimeout)),
    uploadRetries: asNumber(opt.uploadRetries, DEFAULT_OPTIONS.uploadRetries),
    downloadTimeout: Duration.Seconds(asNumber(opt.downloadTimeout, DEFAULT_OPTIONS.downloadTimeout)),
    fileCheckInterval: Duration.Seconds(asNumber(opt.fileCheckInterval, DEFAULT_OPTIONS.fileCheckInterval)),
    downloadCheckInterval: Duration.Seconds(asNumber(opt.downloadCheckInterval, DEFAULT_OPTIONS.downloadCheckInterval)),
    stateCheckInterval: Duration.Seconds(asNumber(opt.stateCheckInterval, DEFAULT_OPTIONS.stateCheckInterval)),
    inFlightDelay: Duration.Seconds(asNumber(opt.inFlightDelay, DEFAULT_OPTIONS.inFlightDelay)),
    waitTimeSeconds: Duration.Seconds(asNumber(opt.waitTimeSeconds, DEFAULT_OPTIONS.waitTimeSeconds)),
    waitTokenError: asNumber(opt.waitTokenError, DEFAULT_OPTIONS.waitTokenError),
    transferPoolSize: asNumber(opt.transferPoolSize, DEFAULT_OPTIONS.transferPoolSize),
    downloadMode,
    filetype: asArrayOf(isString)(opt.filetype, DEFAULT_OPTIONS.filetype),
    sampleDirectory: asString(opt.sampleDirectory, DEFAULT_OPTIONS.sampleDirectory),
    // optional values
    useGraphQL: asBoolean(opt.useGraphQL, false),
    idWorkflowInstance: asOptIndex(opt.id_workflow_instance),
    idDataset: asOptIndex(opt.id_dataset),
    debounceWindow: Duration.Seconds(asNumber(opt.debounceWindow, DEFAULT_OPTIONS.debounceWindow)),
    // EPI2ME-FS options
    inputFolders: asOptArrayOf(isString)(opt.inputFolders),
    outputFolder: asOptString(opt.outputFolder),
    awsAcceleration: asOptString(opt.awsAcceleration),
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
