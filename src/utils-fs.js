/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, ahurst, gvanginkel
 * Created: 2016-05-17
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { isString } from 'lodash';
import utils from './utils';
import filestats from './filestats';

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

utils.countFileReads = filePath => {
  return filestats(filePath).then(d => d.reads); // backwards-compatibility
};

let IdCounter = 0;
utils.getFileID = () => {
  IdCounter += 1;
  return `FILE_${IdCounter}`;
};

utils.lsFolder = (dir, ignore, filetype, rootDir = '') =>
  fs.readdir(dir).then(filesIn => {
    let ls = filesIn;
    if (ignore) {
      ls = ls.filter(ignore);
    }

    let folders = [];
    const files = [];
    const promises = ls.map(entry =>
      fs.stat(path.join(dir, entry)).then(stats => {
        if (stats.isDirectory()) {
          folders.push(path.join(dir, entry));
          return Promise.resolve();
        }

        if (stats.isFile() && (!filetype || path.extname(entry) === filetype)) {
          /** For each file, construct a file object: */
          const parsed = path.parse(entry);

          const fileObject = {
            name: parsed.base,
            path: path.join(dir, entry),
            size: stats.size,
            id: utils.getFileID(),
          };

          const batch = dir
            .replace(rootDir, '')
            .replace('\\', '')
            .replace('/', '');
          if (isString(batch) && batch.length) fileObject.batch = batch;
          files.push(fileObject);
          return Promise.resolve();
        }

        return Promise.resolve(); // unhandled type. ignore? reject?
      }),
    );

    return Promise.all(promises)
      .then(() => {
        folders = folders.sort();
        /**
         * // It's important to load the batch folders alphabetically
         * 1, then 2, etc.
         */
        return Promise.resolve({ files, folders });
      })
      .catch(err => Promise.reject(new Error(`error listing folder ${err}`)));
  });

utils.loadInputFiles = ({ inputFolder, outputFolder, uploadedFolder, filetype }, log, extraFilter) =>
  /**
   * Entry point for new .fast5 / .fastq files.
   *  - Scan the input folder files
   *      fs.readdir is resource-intensive if there are a large number of files
   *      It should only be triggered when needed
   *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
   */

  new Promise((resolve, reject) => {
    // function used to filter the readdir results in utils.lsFolder
    // exclude all files and folders meet any of these criteria:
    const inputFilter = file => {
      const basename = path.basename(file);
      return !(
        file.split(path.sep).filter(x => x.match(/^[.]/)).length || // MC-6941 do not upload files beginning with dot
        basename === 'downloads' ||
        basename === 'uploaded' ||
        basename === 'skip' ||
        basename === 'fail' ||
        (uploadedFolder && basename === path.basename(uploadedFolder)) ||
        (outputFolder && basename === path.basename(outputFolder)) ||
        basename === 'tmp' ||
        (extraFilter ? extraFilter(file) : null)
      ); // logged in database
    };

    // iterate through folders
    let batchFolders = [inputFolder];

    const next = () => {
      if (!batchFolders || !batchFolders.length) {
        return;
      }

      utils
        .lsFolder(batchFolders.splice(0, 1)[0], inputFilter, filetype, inputFolder)
        .then(({ files, folders }) => {
          // Keep iterating though batch folders until one with files is found
          if (files && files.length) {
            resolve(files); // Done. Resolve promise with new files
            return;
          }
          batchFolders = [...folders, ...batchFolders];
          if (batchFolders.length) {
            next(); // iterate
          } else {
            resolve([]); // Done. No new files were found. Needs to emit an array
          }
        })
        .catch(err => {
          reject(new Error(`Failed to check for new files: ${err.message}`));
        });
    };

    next(); // start first iteration
  });

export default utils;
