import crypto from 'crypto';
import { merge } from 'lodash';
import * as tunnel from 'tunnel';
import { version as VERSION } from '../package.json';

const gqlUtils = (function magic() {
  const internal = {
    sign: (req, optionsIn) => {
      // common headers required for everything
      if (!req.headers) {
        req.headers = {};
      }
      let options = optionsIn;
      if (!options) {
        options = {};
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
          .filter(o => o.match(/^x-epi2me/i))
          .map(o => `${o}:${req.headers[o]}`)
          .join('\n'),
        req.body,
      ].join('\n');

      const digest = crypto
        .createHmac('sha1', options.apisecret)
        .update(message)
        .digest('hex');
      req.headers['X-EPI2ME-SIGNATUREV0'] = digest;
    },
  };
  return {
    version: VERSION,
    setHeaders: (req, optionsIn) => {
      const { log } = merge({ log: { debug: () => { } } }, optionsIn);
      // common headers required for everything
      let options = optionsIn;
      if (!options) {
        options = {};
      }

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

      if (!('signing' in options) || options.signing) {
        // if not present: sign
        // if present and true: sign
        internal.sign(req, options);
      }

      if (options.proxy) {
        const matches = options.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);
        const user = matches[2];
        const pass = matches[3];
        const host = matches[4];
        const port = matches[5];
        const proxy = { host, port };

        if (user && pass) {
          proxy.proxyAuth = `${user}:${pass}`;
        }

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
