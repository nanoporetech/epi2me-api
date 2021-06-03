/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, ahurst, gvanginkel
 * Created: 2016-05-17
 */

import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs';
import path from 'path';
import type { UtilityOptions } from './utils';
import { utils } from './utils';
import { NoopLogger } from './Logger';
import ProxyAgent from 'proxy-agent';

export const utilsFS = {
  ...utils,

  async pipe(
    uriIn: string,
    filepath: string,
    options: UtilityOptions,
    progressCb: (e: unknown) => void,
  ): Promise<unknown> {
    let srv = options.url;
    let uri = `/${uriIn}`; // note no forced extension for piped requests
    srv = srv.replace(/\/+$/, ''); // clip trailing slashes
    uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
    const call = srv + uri;
    const req: AxiosRequestConfig = {
      url: call,
      headers: {
        'Accept-Encoding': 'gzip',
        Accept: 'application/gzip',
      },
    };

    const log = options.log ?? NoopLogger;

    this.headers(req, options);

    if (options.proxy) {
      const proxy = ProxyAgent(options.proxy);
      log.debug(`Using proxy for request`);
      req.httpsAgent = proxy;
      req.proxy = false; // do not double-interpret proxy settings
    }

    if (progressCb) {
      req.onUploadProgress = progressCb;
    }
    req.responseType = 'stream';

    // NOTE .url will only not be defined if it is removed during `this.headers()`
    // but we have to check to satisfy the type checker
    if (!req.url) {
      throw new Error('unreachable: url argument in PIPE was deleted');
    }

    const res = await axios.get(req.url, req);

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      res.data.pipe(writer);

      writer.on('finish', () => {
        resolve(filepath);
      });
      writer.on('error', (error: NodeJS.ErrnoException) => {
        // NOTE this is ONLY used by REST.bundleWorkflow
        log.critical('FS_FAILURE', `Failed to bundle workflow ${error.message}`);
        reject(new Error(`writer failed ${String(error)}`));
      });
    });
  },

  stripFile(filename: string): [string, string] {
    return [path.dirname(filename), path.basename(filename)];
  },
};
