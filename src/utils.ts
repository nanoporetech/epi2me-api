/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, ahurst, gvanginkel
 * Created: 2016-05-17
 */
import { Dictionary, isDefined } from 'ts-runtime-typecheck';
import type { Logger } from './Logger.type';

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { isDictionary } from 'ts-runtime-typecheck';
import { NoopLogger } from './Logger';
import { DEFAULT_OPTIONS } from './default_options';
import { USER_AGENT } from './UserAgent.constants';
import type { Agent } from 'http';

axios.defaults.validateStatus = (status: number): boolean => status <= 504; // Reject only if the status code is greater than or equal to 500
export interface Utility {
  setProxyAgent(proxyAgent?: Agent): void;
  headers(request: AxiosRequestConfig, options: UtilityOptions): void;
  head(uri: string, options: UtilityOptions): Promise<AxiosResponse<unknown>>;
  get(uri: string, options: UtilityOptions): Promise<Dictionary>;
  post<T = Dictionary>(
    uriIn: string,
    obj: Dictionary,
    options: UtilityOptions & { handler?: (res: AxiosResponse<unknown>) => Promise<T> },
  ): Promise<T | Dictionary>;
  put(uri: string, id: string, obj: Dictionary, options: UtilityOptions): Promise<Dictionary>;
  mangleURL(uri: string, options: UtilityOptions): string;
  processLegacyForm(req: AxiosRequestConfig, data: Dictionary): void;
}

export interface UtilityOptions {
  url: string;
  skip_url_mangle?: boolean;
  agent_version?: string;
  headers?: Dictionary;
  signing?: boolean;
  proxy?: string;
  apisecret?: string;
  apikey?: string;
  log?: Logger;
  legacy_form?: boolean;
}

export const utils: Utility = (function magic(): Utility {
  let proxyAgent: Agent | undefined = undefined;

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

      let headers = req.headers;
      if (!headers) {
        headers = {};
        req.headers = headers;
      }

      const message = [
        req.url,

        Object.keys(headers)
          .sort()
          .filter((o) => /^x-epi2me/i.test(o))
          .map((o) => `${o}:${headers[o]}`)
          .join('\n'),
      ].join('\n');

      const digest = crypto.createHmac('sha1', options.apisecret).update(message).digest('hex');
      req.headers['X-EPI2ME-SignatureV0'] = digest;
    },

    responseHandler(r: AxiosResponse<unknown>): Dictionary {
      const json = r && isDictionary(r.data) ? r.data : null;

      if (r && r.status >= 400) {
        let msg = `Network error ${r.status}`;
        if (json?.error) {
          msg = json.error + '';
        }

        if (r.status === 504) {
          // always override 504 with something custom
          msg = 'Please check your network connection and try again.';
        }

        throw new Error(msg);
      }

      if (!json) {
        throw new Error('unexpected non-json response');
      }

      if (json.error) {
        throw new Error(json.error + '');
      }

      return json;
    },
  };

  return {
    setProxyAgent(agent?: Agent) {
      proxyAgent = agent;
    },
    headers(req: AxiosRequestConfig, options: UtilityOptions): void {
      // common headers required for everything
      req.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-EPI2ME-Client': USER_AGENT, // new world order
        'X-EPI2ME-Version': options.agent_version ?? DEFAULT_OPTIONS.agent_version, // new world order
        ...req.headers,
        ...options.headers,
      };

      if (options.signing ?? true) {
        // if not present: sign
        // if present and true: sign
        internal.sign(req, options);
      }

      if (isDefined(proxyAgent)) {
        const log = options.log ?? NoopLogger;
        log.debug('Using proxy for request');
        req.httpsAgent = proxyAgent;
        req.proxy = false; // do not double-interpret proxy settings
      }
    },

    async head(uriIn: string, options: UtilityOptions): Promise<AxiosResponse<unknown>> {
      // do something to get/set data in epi2me
      const call = this.mangleURL(uriIn, options);
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

    async get(uriIn: string, options: UtilityOptions): Promise<Dictionary> {
      // do something to get/set data in epi2me
      const call = this.mangleURL(uriIn, options);
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

    async post<T = Dictionary>(
      uriIn: string,
      obj: Dictionary,
      options: UtilityOptions & { handler?: (res: AxiosResponse<unknown>) => Promise<T> },
    ): Promise<T | Dictionary> {
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

      const { data } = req;
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

    async put(uriIn: string, id: string, obj: Dictionary, options: UtilityOptions): Promise<Dictionary> {
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
      const { data } = req;
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

    processLegacyForm(req: AxiosRequestConfig, data: Dictionary): void {
      // include legacy form parameters
      const params: string[] = [];
      // WARN this behavior seems suspicious, the backend for this should be inspected
      const form: Dictionary = {
        json: JSON.stringify(data),
        ...data,
      };
      Object.keys(form)
        .sort()
        .forEach((attr) => {
          params.push(`${attr}=${escape(form[attr] + '')}`);
        });
      req.data = params.join('&');
      if (!req.headers) {
        req.headers = {};
      }
      req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    },
  };
})();
