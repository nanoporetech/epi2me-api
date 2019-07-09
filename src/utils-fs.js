/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, ahurst, gvanginkel
 * Created: 2016-05-17
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { flatten, remove } from 'lodash';
import utils from './utils';

utils.pipe = async (uriIn, filepath, options, progressCb) => {
  let srv = options.url;
  let uri = `/${uriIn}`; // note no forced extension for piped requests
  srv = srv.replace(/\/+$/, ''); // clip trailing slashes
  uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
  const call = srv + uri;
  const req = {
    uri: call,
    gzip: true,
    headers: {
      'Accept-Encoding': 'gzip',
      Accept: 'application/gzip',
    },
  };

  utils.headers(req, options);

  if (options.proxy) {
    req.proxy = options.proxy;
  }

  if (progressCb) {
    req.onUploadProgress = progressCb;
  }
  req.responseType = 'stream';

  const p = new Promise(async (resolve, reject) => {
    try {
      const writer = fs.createWriteStream(filepath);
      const res = await axios.get(req.uri, req);
      res.data.pipe(writer);

      writer.on('finish', resolve(filepath));
      writer.on('error', reject(new Error('writer failed')));
    } catch (err) {
      reject(err);
    }
  });

  return p;
};

let IdCounter = 0;
utils.getFileID = () => {
  IdCounter += 1;
  return `FILE_${IdCounter}`;
};

utils.lsRecursive = async (rootFolder, item, exclusionFilter) => {
  const stat = fs.statSync(item); // hmm. prefer database over fs statting?
  if (exclusionFilter) {
    const result = await exclusionFilter(item, stat);
    if (result) {
      return null;
    }
  }

  if (stat.isDirectory()) {
    return fs
      .readdir(item)
      .then(listing => {
        // map short names to full paths
        return listing.map(childItem => path.join(item, childItem));
      })
      .then(listing => {
        // map full paths to array of Promises for exclusion checks
        return Promise.all(listing.map(childPath => utils.lsRecursive(rootFolder, childPath, exclusionFilter)));
      })
      .then(listing => {
        // array of exclusion checks
        return flatten(listing);
      });
  }

  return {
    name: path.parse(item).base, // "my.fastq"
    path: item, // "/Users/rpettett/test_sets/zymo/demo/INPUT_PREFIX/my.fastq"
    relative: item.replace(rootFolder, ''), // "INPUT_PREFIX/my.fastq"
    size: stat.size,
    id: utils.getFileID(),
  };
};

utils.loadInputFiles = async ({ inputFolder, outputFolder, filetypeIn }, log, extraFilter) => {
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
  let filetype = filetypeIn;
  if (filetypeIn && filetypeIn.indexOf('.') !== 0) {
    filetype = `.${filetypeIn}`;
  }

  const exclusionFilter = async (file, stat) => {
    const basename = path.basename(file);

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
        return file.split(path.sep).filter(x => x.match(/^[.]/)).length || // MC-6941 do not upload from any location beginning with dot
          (outputFolder && basename === path.basename(outputFolder)) ||
          (filetype && path.extname(file) !== filetype && stat.isFile()) // exclude any file not matching wanted file extension
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

    return Promise.all(promises)
      .then(() => {
        return null; // falsy == do not exclude
      })
      .catch(() => {
        return 'exclude'; // truthy == exclude
      }); // rejection just means don't keep
  };

  const actionList = await utils.lsRecursive(inputFolder, inputFolder, exclusionFilter);
  return Promise.resolve(remove(actionList, null));
};

export default utils;
