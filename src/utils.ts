/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, ahurst, gvanginkel
 * Created: 2016-05-17
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { merge } from 'lodash';
import * as tunnel from 'tunnel';
import { version as VERSION } from '../package.json';
import { NoopLogger, LogMethod } from './Logger';
import { ObjectDict } from './ObjectDict';
import { asRecord } from './runtime-typecast';

axios.defaults.validateStatus = (status: number): boolean => status <= 504; // Reject only if the status code is greater than or equal to 500

export interface Utility {
  version: string;
  headers(request: AxiosRequestConfig, options: UtilityOptions): void;
  head(uri: string, options: UtilityOptions): Promise<AxiosResponse>;
  get(uri: string, options: UtilityOptions): Promise<ObjectDict>;
  post<T = ObjectDict>(uriIn: string, obj: ObjectDict, options: UtilityOptions & { handler?: (res: AxiosResponse) => Promise<T> }): Promise<T | ObjectDict>;
  put(uri: string, id: string, obj: ObjectDict, options: UtilityOptions): Promise<ObjectDict>;
  mangleURL(uri: string, options: UtilityOptions): string;
  processLegacyForm(req: AxiosRequestConfig, data: ObjectDict): void;
  convertResponseToObject(data: string | ObjectDict): ObjectDict;
}

export interface UtilityOptions {
  url: string;
  skip_url_mangle?: boolean;
  user_agent?: string;
  agent_version?: string;
  headers?: ObjectDict;
  signing?: boolean;
  proxy?: string;
  apisecret?: string;
  apikey?: string;
  log?: {
    debug: LogMethod;
  };
  legacy_form?: boolean;
}

const utils: Utility = (function magic(): Utility {
  const internal = {
    sign: (req: AxiosRequestConfig, options?: UtilityOptions): void => {
      // unable to sign if options is undefined
      if (!options) {
        return;
      }

      // common headers required for everything
      if (!req.headers) {
        req.headers = {};
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

      if (req.url?.match(/^https:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.url = req.url.replace(/:443/, '');
      }

      if (req.url?.match(/^http:/)) {
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

    responseHandler(r: AxiosResponse<unknown>): ObjectDict {
      const json = r ? asRecord(r.data) : null;

      if (!json) {
        throw new Error('unexpected non-json response');
      }

      if (r && r.status >= 400) {
        let msg = `Network error ${r.status}`;
        if (json.error) {
          msg = json.error + "";
        }

        if (r.status === 504) {
          // always override 504 with something custom
          msg = 'Please check your network connection and try again.';
        }

        throw new Error(msg);
      }

      if (json.error) {
        throw new Error(json.error + "");
      }

      return json;
    },
  };

  return {
    version: VERSION,
    headers(req: AxiosRequestConfig, options: UtilityOptions): void {

      // common headers required for everything
      req.headers = merge(
        {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-Client': options.user_agent || 'api', // new world order
          'X-EPI2ME-Version': options.agent_version || utils.version, // new world order
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
        const port = parseInt(matches[5], 10);
        const proxy: tunnel.ProxyOptions = {
          host,
          port,
        };

        if (user && pass) {
          proxy.proxyAuth = `${user}:${pass}`;
        }

        const log = options.log ?? NoopLogger;

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

    async head(uriIn: string, options: UtilityOptions): Promise<AxiosResponse> {
      // do something to get/set data in epi2me
      const call = this.mangleURL(uriIn, options)
      const req: AxiosRequestConfig = { url: call };

      this.headers(req, options);

      // NOTE .url will only not be defined if it is removed during `this.headers()`
      // but we have to check to satisfy the type checker
      if (!req.url) {
        throw new Error('unreachable: url argument in HEAD was deleted');
      }

      const log = options.log ?? NoopLogger;

      log.debug('HEAD', req.url); // , JSON.stringify(req));
      const res = await axios.head(req.url, req); // url, headers++

      if (res && res.status >= 400) {
        if (res.status === 504) {
          // always override 504 with something custom
          throw new Error('Please check your network connection and try again.');
        }
        throw new Error(`Network error ${res.status}`);
      }
      return res;
    },

    async get(uriIn: string, options: UtilityOptions): Promise<ObjectDict> {
      // do something to get/set data in epi2me
      const call = this.mangleURL(uriIn, options)
      const req: AxiosRequestConfig = { url: call };

      this.headers(req, options);

      // NOTE .url will only not be defined if it is removed during `this.headers()`
      // but we have to check to satisfy the type checker
      if (!req.url) {
        throw new Error('unreachable: url argument in GET was deleted');
      }

      const log = options.log ?? NoopLogger;

      log.debug('GET', req.url);
      const res = await axios.get(req.url, req); // url, headers++

      return internal.responseHandler(res);
    },

    async post<T = ObjectDict>(uriIn: string, obj: ObjectDict, options: UtilityOptions & { handler?: (res: AxiosResponse) => Promise<T> }): Promise<T | ObjectDict> {

      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      const uri = uriIn.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}`;
      const req: AxiosRequestConfig = {
        url: call,
        data: obj,
        headers: {},
      };

      if (options.legacy_form) {
        this.processLegacyForm(req, obj);
      }

      this.headers(req, options);

      const {
        data
      } = req;
      delete req.data;

      const log = options.log ?? NoopLogger;

      // NOTE .url will only not be defined if it is removed during `this.headers()`
      // but we have to check to satisfy the type checker
      if (!req.url) {
        throw new Error('unreachable: url argument in POST was deleted');
      }

      log.debug('POST', req.url); // , data, JSON.stringify(req));
      const res = await axios.post(req.url, data, req); // url, data, headers++

      if (options.handler) {
        return options.handler(res);
      }
      return internal.responseHandler(res);
    },

    async put(uriIn: string, id: string, obj: ObjectDict, options: UtilityOptions): Promise<ObjectDict> {

      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      const uri = uriIn.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}/${id}`;
      const req: AxiosRequestConfig = {
        url: call,
        data: obj,
        headers: {},
      };

      if (options.legacy_form) {
        this.processLegacyForm(req, obj);
      }

      this.headers(req, options);

      // TODO fix whatever this is doing
      const {
        data
      } = req;
      delete req.data;

      const log = options.log ?? NoopLogger;

      // NOTE .url will only not be defined if it is removed during `this.headers()`
      // but we have to check to satisfy the type checker
      if (!req.url) {
        throw new Error('unreachable: url argument in PUT was deleted');
      }

      log.debug('PUT', req.url); // , data, JSON.stringify(req));
      const res = await axios.put(req.url, data, req); // url, data, headers++
      return internal.responseHandler(res);
    },

    mangleURL(uri: string, options: UtilityOptions): string {
      let srv = options.url;
      if (!options.skip_url_mangle) {
        uri = `/${uri}`; // + ".json";
        srv = srv.replace(/\/+$/, ''); // clip trailing slashes
        uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
        return srv + uri;
      } else {
        return uri;
      }
    },

    processLegacyForm(req: AxiosRequestConfig, data: ObjectDict): void {
      // include legacy form parameters
      const params: string[] = [];
      const form = merge(
        { json: JSON.stringify(data) },
        data,
      );
      Object.keys(form)
        .sort()
        .forEach(attr => {
          params.push(`${attr}=${escape(form[attr] + "")}`);
        });
      req.data = params.join('&');
      req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    },

    convertResponseToObject(data: ObjectDict | string): ObjectDict {
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
