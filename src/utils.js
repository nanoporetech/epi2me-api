/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, ahurst, gvanginkel
 * Created: 2016-05-17
 */

import axios from 'axios';
import crypto from 'crypto';
import { merge } from 'lodash';
import * as tunnel from 'tunnel';
import { version as VERSION } from '../package.json';

axios.defaults.validateStatus = status => status <= 504; // Reject only if the status code is greater than or equal to 500

const utils = (function magic() {
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

      if (!options.apikey) {
        // cannot sign without apikey
        return;
      }
      req.headers['X-EPI2ME-ApiKey'] = options.apikey; // better than a logged CGI parameter

      if (!options.apisecret) {
        // cannot sign without apisecret
        return;
      }

      // timestamp mitigates replay attack outside a tolerance window determined by the server
      req.headers['X-EPI2ME-SignatureDate'] = new Date().toISOString();

      if (req.url.match(/^https:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.url = req.url.replace(/:443/, '');
      }

      if (req.url.match(/^http:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.url = req.url.replace(/:80/, '');
      }

      const message = [
        req.url,

        Object.keys(req.headers)
          .sort()
          .filter(o => o.match(/^x-epi2me/i))
          .map(o => `${o}:${req.headers[o]}`)
          .join('\n'),
      ].join('\n');

      const digest = crypto
        .createHmac('sha1', options.apisecret)
        .update(message)
        .digest('hex');
      req.headers['X-EPI2ME-SignatureV0'] = digest;
    },

    responseHandler: async r => {
      const json = r ? r.data : null;

      if (!json) {
        return Promise.reject(new Error('unexpected non-json response'));
      }

      if (r && r.status >= 400) {
        let msg = `Network error ${r.status}`;
        if (json.error) {
          msg = json.error;
        }

        if (r.status === 504) {
          // always override 504 with something custom
          msg = 'Please check your network connection and try again.';
        }

        return Promise.reject(new Error(msg));
      }

      if (json.error) {
        return Promise.reject(new Error(json.error));
      }

      return Promise.resolve(json);
    },
  };

  return {
    version: VERSION,
    headers: (req, optionsIn) => {
      const { log } = merge(
        {
          log: {
            debug: () => {},
          },
        },
        optionsIn,
      );
      // common headers required for everything
      let options = optionsIn;
      if (!options) {
        options = {};
      }

      req.headers = merge(
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-Client': options.user_agent || 'api', // new world order
          'X-EPI2ME-Version': options.agent_version || utils.version, // new world order
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
        const proxy = {
          host,
          port,
        };

        if (user && pass) {
          proxy.proxyAuth = `${user}:${pass}`;
        }

        if (options.proxy.match(/^https/)) {
          log.debug(`using HTTPS over HTTPS proxy`, JSON.stringify(proxy)); // nb. there's no CA/cert handling for self-signed certs
          req.httpsAgent = tunnel.httpsOverHttps({
            proxy,
          });
        } else {
          log.debug(`using HTTPS over HTTP proxy`, JSON.stringify(proxy));
          req.httpsAgent = tunnel.httpsOverHttp({
            proxy,
          });
        }
        req.proxy = false; // do not double-interpret proxy settings
      }
    },

    head: async (uriIn, options) => {
      // do something to get/set data in epi2me
      const { log } = merge(
        {
          log: {
            debug: () => {},
          },
        },
        options,
      );
      let call;

      let srv = options.url;
      let uri = uriIn;
      if (!options.skip_url_mangle) {
        uri = `/${uri}`; // + ".json";
        srv = srv.replace(/\/+$/, ''); // clip trailing slashes
        uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
        call = srv + uri;
      } else {
        call = uri;
      }

      const req = {
        url: call,
        gzip: true,
      };
      utils.headers(req, options);

      let res;
      try {
        log.debug(`GET ${req.url}`); // , JSON.stringify(req));
        res = await axios.head(req.url, req); // url, headers++

        if (res && res.status >= 400) {
          let msg = `Network error ${res.status}`;
          if (res.status === 504) {
            // always override 504 with something custom
            msg = 'Please check your network connection and try again.';
          }

          return Promise.reject(new Error(msg));
        }
      } catch (err) {
        return Promise.reject(err);
      }
      return Promise.resolve(res);
    },

    get: async (uriIn, options) => {
      // do something to get/set data in epi2me
      const { log } = merge(
        {
          log: {
            debug: () => {},
          },
        },
        options,
      );
      let call;

      let srv = options.url;
      let uri = uriIn;
      if (!options.skip_url_mangle) {
        uri = `/${uri}`; // + ".json";
        srv = srv.replace(/\/+$/, ''); // clip trailing slashes
        uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
        call = srv + uri;
      } else {
        call = uri;
      }

      const req = {
        url: call,
        gzip: true,
      };
      utils.headers(req, options);

      let res;
      try {
        log.debug(`GET ${req.url}`); // , JSON.stringify(req));
        res = await axios.get(req.url, req); // url, headers++
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res, options);
    },

    post: async (uriIn, obj, options) => {
      const { log } = merge(
        {
          log: {
            debug: () => {},
          },
        },
        options,
      );
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      const uri = uriIn.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}`;
      const req = {
        url: call,
        gzip: true,
        data: obj,
        headers: {},
      };

      if (options.legacy_form) {
        // include legacy form parameters
        const params = [];
        const form = merge(
          {
            json: JSON.stringify(obj),
          },
          obj,
        );
        Object.keys(form)
          .sort()
          .forEach(attr => {
            params.push(`${attr}=${escape(form[attr])}`);
          });
        req.data = params.join('&');
        req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      utils.headers(req, options);

      const { data } = req;
      delete req.data;

      let res;
      try {
        log.debug(`POST ${req.url}`); // , data, JSON.stringify(req));
        res = await axios.post(req.url, data, req); // url, data, headers++
      } catch (err) {
        return Promise.reject(err);
      }

      if (options.handler) {
        return options.handler(res);
      }
      return internal.responseHandler(res, options);
    },

    put: async (uriIn, id, obj, options) => {
      const { log } = merge(
        {
          log: {
            debug: () => {},
          },
        },
        options,
      );
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      const uri = uriIn.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}/${id}`;
      const req = {
        url: call,
        gzip: true,
        data: obj,
        headers: {},
      };

      if (options.legacy_form) {
        // include legacy form parameters
        const params = [];
        const form = merge(
          {
            json: JSON.stringify(obj),
          },
          obj,
        );
        Object.keys(form)
          .sort()
          .forEach(attr => {
            params.push(`${attr}=${escape(form[attr])}`);
          });
        req.data = params.join('&');
        req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      utils.headers(req, options);

      const { data } = req;
      delete req.data;

      let res;
      try {
        log.debug(`PUT ${req.url}`); // , data, JSON.stringify(req));
        res = await axios.put(req.url, data, req); // url, data, headers++
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res, options);
    },
    // convertResponseToObject(data: Record<string, any> | string): Record<string, any> {
    convertResponseToObject(data) {
      if (typeof data === 'object') {
        // already parsed
        return data;
      } else {
        try {
          return JSON.parse(data);
        } catch (jsonException) {
          throw new Error(`exception parsing chain JSON ${String(jsonException)}`);
        }
      }
    },
  };
})();

export default utils;
