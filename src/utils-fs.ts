/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, ahurst, gvanginkel
 * Created: 2016-05-17
 */

import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import utils, { UtilityOptions, Utility } from './utils';
import { NoopLogger } from './Logger';
import * as tunnel from 'tunnel';

let IdCounter = 0;

export interface FileStat {
  name: string;
  path: string;
  relative: string;
  size: number;
  id: string;
}

export interface UtilityFS extends Utility {
  pipe(uri: string, path: string, options: UtilityOptions, progressCallback: (e: unknown) => void): Promise<unknown>;
  getFileID(): string;
  lsRecursive(
    rootFolderIn: string,
    item: string,
    exclusionFilter: (str: string, stat: fs.Stats) => Promise<boolean>,
  ): Promise<FileStat[]>;
  loadInputFiles(
    {
      inputFolders,
      outputFolder,
      filetype: filetypesIn,
    }: { inputFolders: string[]; outputFolder?: string; filetype: string | string[] },
    _log: unknown,
    extraFilter?: (file: string) => Promise<boolean>,
  ): Promise<FileStat[]>;
  stripFile(filename: string): [string, string];
}

const utilsFS: UtilityFS = {
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

    this.headers(req, options);

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
      writer.on('error', error => {
        reject(new Error(`writer failed ${String(error)}`));
      });
    });
  },

  getFileID(): string {
    IdCounter += 1;
    return `FILE_${IdCounter}`;
  },

  async lsRecursive(
    rootFolderIn: string,
    item: string,
    exclusionFilter: (str: string, stat: fs.Stats) => Promise<boolean>,
  ): Promise<FileStat[]> {
    let rootFolder = rootFolderIn;
    // TODO refactor to use fdir ( see sample-reader ) to simplify this
    const stat = fs.statSync(item); // hmm. prefer database over fs statting?

    if (exclusionFilter) {
      const result = await exclusionFilter(item, stat);
      if (result) {
        return [];
      }
    }

    if (stat.isDirectory()) {
      const folderContents = await fs.readdir(item);

      const recursiveFolderContents = [];

      for (const folderEntry of folderContents) {
        const fullPath = path.join(item, folderEntry);
        for (const item of await this.lsRecursive(rootFolder, fullPath, exclusionFilter)) {
          recursiveFolderContents.push(item);
        }
      }

      return recursiveFolderContents;
    }

    if (stat.isFile() && rootFolder === item) {
      rootFolder = path.dirname(item);
    }
    return [
      {
        name: path.parse(item).base, // "my.fastq"
        path: item, // "/Users/rpettett/test_sets/zymo/demo/INPUT_PREFIX/my.fastq"
        relative: item.replace(rootFolder, ''), // "INPUT_PREFIX/my.fastq"
        size: stat.size,
        id: this.getFileID(),
      },
    ];
  },

  async loadInputFiles(
    {
      inputFolders,
      outputFolder,
      filetype: filetypesIn,
    }: { inputFolders: string[]; outputFolder?: string; filetype: string | string[] },
    _log: unknown,
    extraFilter?: (file: string) => Promise<boolean>,
  ): Promise<FileStat[]> {
    // console.log(inputFolders, outputFolder, filetypesIn);
    /**
     * Entry point for new .fast5 / .fastq files.
     *  - Scan the input folder files
     *      fs.readdir is resource-intensive if there are a large number of files
     *      It should only be triggered when needed
     *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
     */

    // function used to filter the readdir results in utils.lsFolder
    // exclude all files and folders meet any of these criteria:

    // todo: need to support an array of types, e.g. [fasta, fa, fa.gz]
    let filetypes: string[];
    if (Array.isArray(filetypesIn)) {
      filetypes = filetypesIn;
    } else {
      // MC-6727 support array of types: backwards compatibility support for single string value
      filetypes = [filetypesIn];
    }

    filetypes = filetypes.map(ft => {
      return ft && ft.indexOf('.') !== 0 ? `.${ft}` : ft;
    });

    const exclusionFilter = async (file: string, stat: fs.Stats): Promise<boolean> => {
      const basename = path.basename(file);

      // TODO 2/3 of these "async" checks are not async. Refactor this
      const promises = [
        new Promise((resolve, reject) => {
          return basename === 'downloads' || // quick checks first
            basename === 'skip' ||
            basename === 'fail' ||
            basename === 'fastq_fail' ||
            basename === 'tmp'
            ? reject(new Error(`${file} failed basic filename`))
            : resolve('basic ok');
        }),
        new Promise((resolve, reject) => {
          const filetypeRe = filetypes.length ? new RegExp(`(?:${filetypes.join('|')})$`) : null;
          return file.split(path.sep).filter(x => x.match(/^[.]/)).length || // MC-6941 do not upload from any location beginning with dot
            (outputFolder && basename === path.basename(outputFolder)) ||
            (filetypeRe && !file.match(filetypeRe) && stat.isFile()) // exclude any file not matching wanted file extension
            ? reject(new Error(`${file} failed extended filename`))
            : resolve('extended ok');
        }),
        extraFilter
          ? new Promise((resolve, reject) => {
              extraFilter(file).then(result => {
                return result ? reject(new Error(`${file} failed extraFilter`)) : resolve('extra ok');
              });
            })
          : Promise.resolve('extra skip'),
      ];

      try {
        await Promise.all(promises);
        return false; // falsy == do not exclude
      } catch (e) {
        // rejection just means don't keep
        return true; // truthy == exclude
      }
    };

    const results: FileStat[] = [];
    for (const folder of inputFolders) {
      const contents = await this.lsRecursive(folder, folder, exclusionFilter);
      results.push(...contents.filter(c => !!c));
    }
    return results;
  },

  stripFile(filename: string): [string, string] {
    return [path.dirname(filename), path.basename(filename)];
  },
};

export default utilsFS;
