import { ObjectDict } from './ObjectDict';
import { EPI2ME_OPTIONS } from './epi2me-options';
import { asString, isRecord, asBoolean, asOptString, asFunction } from './runtime-typecast';
import { LogMethod, Logger, FallbackLogger } from './Logger';
import { version as VERSION } from '../package.json';
import DEFAULTS from './default_options.json';

function resolveLogger(log: unknown): Logger {
  if (isRecord(log)) {
    try {
      return {
        info: asFunction(log.info) as LogMethod,
        debug: asFunction(log.debug) as LogMethod,
        warn: asFunction(log.warn) as LogMethod,
        error: asFunction(log.error) as LogMethod,
      };
    } catch (e) {
      throw new Error('expected log object to have error, debug, info and warn methods');
    }
  } else {
    return FallbackLogger;
  }
}

export function parseCoreOpts(
  opt: ObjectDict | Partial<EPI2ME_OPTIONS>,
): {
  url: string;
  apikey?: string;
  apisecret?: string;
  agent_version: string;
  jwt?: string;
  local: boolean;
  log: Logger;
  user_agent: string;
  signing: boolean;
} {
  // URL preference is opt.endpoint > opt.url > DEFAULT.url
  const legacyURL = asString(opt.url, DEFAULTS.url);
  return {
    // Return to calling utils.version when utils no longer signs
    agent_version: asString(opt.agent_version, VERSION),
    log: resolveLogger(opt.log),
    local: asBoolean(opt.local, DEFAULTS.local),
    url: asString(opt.endpoint, legacyURL),
    user_agent: asString(opt.user_agent, DEFAULTS.user_agent),
    signing: asBoolean(opt.signing, DEFAULTS.signing),
    // Optional Values
    apikey: asOptString(opt.apikey),
    apisecret: asOptString(opt.apisecret),
    jwt: asOptString(opt.jwt),
  };
}
