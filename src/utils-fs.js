/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { isString, isArray } from 'lodash';
import _utils from './utils';

const utils = _utils;
const targetBatchSize = 4000;

utils.pipe = async (uri, filepath, options, progressCb) => {
  let srv = options.url;
  uri = `/${uri}`; // note no forced extension for piped requests
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

  utils._headers(req, options);

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

utils.countFileReads = filePath =>
  new Promise((resolve, reject) => {
    const linesPerRead = 4;
    let lineCount = 1;
    let idx;
    fs.createReadStream(filePath)
      .on('data', buffer => {
        idx = -1;
        lineCount--;
        do {
          idx = buffer.indexOf(10, idx + 1);
          lineCount++;
        } while (idx !== -1);
      })
      .on('end', () => resolve(Math.floor(lineCount / linesPerRead)))
      .on('error', reject);
  });

// this isn't good... wtf:
// make async!
utils.findSuitableBatchIn = folder => {
  // For downloads without the folder split
  // Look inside `folder` and return any batch with a free slot.
  // if no suitable batches, create one and return that.
  fs.mkdirpSync(folder);
  const prefix = 'batch_';
  const createBatch = () => {
    const batchName = `${prefix}${Date.now()}`;
    const newBatchPath = path.join(folder, batchName);
    fs.mkdirpSync(newBatchPath);
    return newBatchPath;
  };

  const batches = fs.readdirSync(folder).filter(d => d.slice(0, prefix.length) === prefix);

  if (!batches || !batches.length) {
    return createBatch();
  }

  const latestBatch = path.join(folder, batches.pop());
  if (fs.readdirSync(latestBatch).length < targetBatchSize) {
    return latestBatch;
  }
  return createBatch();
};

let IdCounter = 0;
utils.getFileID = () => `FILE_${++IdCounter}`;

utils.lsFolder = (dir, ignore, filetype, rootDir = '') =>
  fs.readdir(dir).then(ls => {
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

utils.loadInputFiles = ({ inputFolder, outputFolder, uploadedFolder, filetype }, uploaded = []) =>
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
        basename === 'downloads' ||
        basename === 'uploaded' ||
        basename === 'skip' ||
        basename === 'fail' ||
        (uploadedFolder && basename === path.basename(uploadedFolder)) ||
        (outputFolder && basename === path.basename(outputFolder)) ||
        basename === 'tmp' ||
        (isArray(uploaded) && uploaded.indexOf(path.posix.basename(file)) > -1)
      );
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
            resolve(); // Done. No new files were found
          }
        })
        .catch(err => {
          reject(new Error(`Failed to check for new files: ${err.message}`));
        });
    };

    next(); // start first iteration
  });

export const get = utils.get;
export const put = utils.put;
export const post = utils.post;
export default utils;
module.exports.version = require('../package.json').version;
