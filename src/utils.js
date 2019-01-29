/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */

import axios from 'axios';
import crypto from 'crypto';

const VERSION = require('../package.json').version;

axios.defaults.validateStatus = status => status <= 504; // Reject only if the status code is greater than or equal to 500

const utils = (function magic() {
  const internal = {
    sign: (req, options) => {
      // common headers required for everything
      if (!req.headers) {
        req.headers = {};
      }

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

      if (req.uri.match(/^https:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:443/, '');
      }

      if (req.uri.match(/^http:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:80/, '');
      }

      const message = [
        req.uri,

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
      let json;
      let body = r ? r.data : '';

      try {
        body = body.replace(/[^]*\n\n/, ''); // why doesn't request always parse headers? Content-type with charset?
        json = JSON.parse(body);
      } catch (err) {
        return Promise.reject(err);
      }

      if (r && r.status >= 400) {
        let msg = `Network error ${r.status}`;
        if (json && json.error) {
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
    version: () => VERSION,
    headers: (req, options) => {
      // common headers required for everything
      if (!options) {
        options = {};
      }

      req.headers = Object.assign(
        {},
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-Client': options.user_agent || 'api', // new world order
          'X-EPI2ME-Version': options.agent_version || utils.version(), // new world order
        },
        req.headers,
      );

      if (options._signing !== false) {
        internal.sign(req, options);
      }
    },

    get: async (uri, options) => {
      // do something to get/set data in epi2me
      let call;

      let srv = options.url;

      if (!options.skip_url_mangle) {
        uri = `/${uri}`; // + ".json";
        srv = srv.replace(/\/+$/, ''); // clip trailing slashes
        uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
        call = srv + uri;
      } else {
        call = uri;
      }

      const req = { uri: call, gzip: true };

      utils.headers(req, options);

      if (options.proxy) {
        req.proxy = options.proxy;
      }

      let res;
      try {
        res = await axios.get(req.uri, req);
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res);
    },

    post: async (uri, obj, options) => {
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}`;

      const req = {
        uri: call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {},
      };

      if (options.legacy_form) {
        // include legacy form parameters
        const form = {};
        form.json = JSON.stringify(obj);

        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(attr => {
            form[attr] = obj[attr];
          });
        } // garbage

        req.form = form;
      }

      utils.headers(req, options);

      if (options.proxy) {
        req.proxy = options.proxy;
      }

      let res;
      try {
        res = await axios.post(req.uri, req);
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res);
    },

    put: async (uri, id, obj, options) => {
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}/${id}`;
      const req = {
        uri: call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {},
      };

      if (options.legacy_form) {
        // include legacy form parameters
        req.form = { json: JSON.stringify(obj) };
      }

      utils.headers(req, options);

      if (options.proxy) {
        req.proxy = options.proxy;
      }

      let res;
      try {
        res = await axios.put(req.uri, req);
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res);
    },
  };
})();

export default utils;
