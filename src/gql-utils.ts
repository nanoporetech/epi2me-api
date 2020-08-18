import crypto from 'crypto';
import { merge } from 'lodash';
import * as tunnel from 'tunnel';
import { version as VERSION } from '../package.json';
import { NoopLogger, Logger } from './Logger';
import { ObjectDict } from './ObjectDict';
import { AxiosRequestConfig } from 'axios';

interface SigningOptions {
  apikey?: string;
  apisecret?: string;
}

type HeaderOptions = {
  proxy?: string;
  user_agent?: string;
  agent_version?: string;
  log?: Logger;
  signing?: boolean;
  headers?: ObjectDict;
} & SigningOptions;

interface GQLUtility {
  version: string;
  setHeaders(req: AxiosRequestConfig, options: HeaderOptions): void;
}

const gqlUtils = ((): GQLUtility => {
  const internal = {
    sign: (req: AxiosRequestConfig & { body: string }, options: SigningOptions = {}): void => {
      // common headers required for everything
      if (!req.headers) {
        req.headers = {};
      }

      if (!options.apikey || !options.apisecret) {
        // cannot sign without apikey or apisecret
        return;
      }
      req.headers['X-EPI2ME-APIKEY'] = options.apikey; // better than a logged CGI parameter
      // timestamp mitigates replay attack outside a tolerance window determined by the server
      req.headers['X-EPI2ME-SIGNATUREDATE'] = new Date().toISOString();

      const message = [
        Object.keys(req.headers)
          .sort()
          .filter((o) => o.match(/^x-epi2me/i))
          .map((o) => `${o}:${req.headers[o]}`)
          .join('\n'),
        req.body,
      ].join('\n');

      const digest = crypto.createHmac('sha1', options.apisecret).update(message).digest('hex');
      req.headers['X-EPI2ME-SIGNATUREV0'] = digest;
    },
  };
  return {
    version: VERSION,
    setHeaders: (req: AxiosRequestConfig & { body: string }, options: HeaderOptions = {}): void => {
      // common headers required for everything

      req.headers = merge(
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-CLIENT': options.user_agent || 'api', // new world order
          'X-EPI2ME-VERSION': options.agent_version || gqlUtils.version, // new world order
        },
        req.headers,
        options.headers,
      );

      if (options.signing ?? true) {
        // if not present: sign
        // if present and true: sign
        internal.sign(req, options);
      }

      if (options.proxy) {
        const matches = options.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);
        if (!matches) {
          throw new Error(`Failed to parse Proxy URL`);
        }
        const user = matches[2];
        const pass = matches[3];
        const host = matches[4];
        const port = +matches[5];
        const proxy: { host: string; port: number; proxyAuth?: string } = { host, port };

        if (user && pass) {
          proxy.proxyAuth = `${user}:${pass}`;
        }

        const log = options.log ?? NoopLogger;

        if (options.proxy.match(/^https/)) {
          log.debug(`using HTTPS over HTTPS proxy`, JSON.stringify(proxy)); // nb. there's no CA/cert handling for self-signed certs
          req.httpsAgent = tunnel.httpsOverHttps({ proxy });
        } else {
          log.debug(`using HTTPS over HTTP proxy`, JSON.stringify(proxy));
          req.httpsAgent = tunnel.httpsOverHttp({ proxy });
        }
        req.proxy = false; // do not double-interpret proxy settings
      }
    },
  };
})();

export default gqlUtils;
