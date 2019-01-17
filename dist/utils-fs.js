"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports._post = exports._put = exports._get = undefined;

var _utils2 = require("./utils");

var _utils3 = _interopRequireDefault(_utils2);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _requestProgress = require("request-progress");

var _requestProgress2 = _interopRequireDefault(_requestProgress);

var _fsExtra = require("fs-extra");

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */
const utils = _utils3.default;
const targetBatchSize = 4000;

utils._pipe = (uri, filepath, options, cb, progressCb) => {
    let srv = options.url;
    uri = "/" + uri; // note no forced extension for piped requests
    srv = srv.replace(/\/+$/, ""); // clip trailing slashes
    uri = uri.replace(/\/+/g, "/"); // clip multiple slashes
    let call = srv + uri;
    let req = {
        uri: call,
        gzip: true,
        headers: {
            "Accept-Encoding": "gzip",
            "Accept": "application/gzip"
        }
    };

    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    if (progressCb) {
        (0, _requestProgress2.default)((0, _request2.default)(req), {}).on("progress", progressCb).on("end", cb).pipe(_fsExtra2.default.createWriteStream(filepath));
    } else {
        (0, _request2.default)(req).pipe(_fsExtra2.default.createWriteStream(filepath)).on("close", cb);
    }
};

utils.countFileReads = filePath => {
    return new Promise((resolve, reject) => {
        const LINES_PER_READ = 4;
        let lineCount = 1;
        let idx;
        _fsExtra2.default.createReadStream(filePath).on("data", buffer => {
            idx = -1;
            lineCount--;
            do {
                idx = buffer.indexOf(10, idx + 1);
                lineCount++;
            } while (idx !== -1);
        }).on("end", () => resolve(Math.floor(lineCount / LINES_PER_READ))).on("error", reject);
    });
};

// this isn't good... wtf:
// make async!
utils.findSuitableBatchIn = folder => {
    // For downloads without the folder split
    // Look inside `folder` and return any batch with a free slot.
    // if no suitable batches, create one and return that.
    _fsExtra2.default.mkdirpSync(folder);
    const prefix = "batch_";
    const createBatch = () => {
        const batchName = `${prefix}${Date.now()}`;
        const newBatchPath = _path2.default.join(folder, batchName);
        _fsExtra2.default.mkdirpSync(newBatchPath);
        return newBatchPath;
    };

    let batches = _fsExtra2.default.readdirSync(folder).filter(d => d.slice(0, prefix.length) === prefix);

    if (!batches || !batches.length) {
        return createBatch();
    }

    const latestBatch = _path2.default.join(folder, batches.pop());
    if (_fsExtra2.default.readdirSync(latestBatch).length < targetBatchSize) {
        return latestBatch;
    }
    return createBatch();
};

let ID_counter = 0;
utils.getFileID = () => `FILE_${++ID_counter}`;

utils.lsFolder = (dir, ignore, filetype, rootDir = "") => {
    return _fsExtra2.default.readdir(dir).then(ls => {
        if (ignore) {
            ls = ls.filter(ignore);
        }

        let folders = [];
        let files = [];
        let promises = ls.map(entry => {
            return _fsExtra2.default.stat(_path2.default.join(dir, entry)).then(stats => {
                if (stats.isDirectory()) {
                    folders.push(_path2.default.join(dir, entry));
                    return Promise.resolve();
                }

                if (stats.isFile() && (!filetype || _path2.default.extname(entry) === filetype)) {
                    /** For each file, construct a file object: */
                    let parsed = _path2.default.parse(entry);

                    let fileObject = {
                        name: parsed.base,
                        path: _path2.default.join(dir, entry),
                        size: stats.size,
                        id: utils.getFileID()
                    };

                    let batch = dir.replace(rootDir, "").replace("\\", "").replace("/", "");
                    if ((0, _lodash.isString)(batch) && batch.length) fileObject.batch = batch;
                    files.push(fileObject);
                    return Promise.resolve();
                }

                return Promise.resolve(); // unhandled type. ignore? reject?
            });
        });

        return Promise.all(promises).then(() => {
            folders = folders.sort();
            /**
             * // It's important to load the batch folders alphabetically
             * 1, then 2, etc.
             */
            return Promise.resolve({ files, folders });
        }).catch(err => {
            return Promise.reject("error listing folder " + err);
        });
    });
};

utils.loadInputFiles = ({ inputFolder, outputFolder, uploadedFolder, filetype }, uploaded = []) => {
    /**
     * Entry point for new .fast5 / .fastq files.
     *  - Scan the input folder files
     *      fs.readdir is resource-intensive if there are a large number of files
     *      It should only be triggered when needed
     *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
     */

    return new Promise((resolve, reject) => {

        // function used to filter the readdir results in utils.lsFolder
        // exclude all files and folders meet any of these criteria:
        const inputFilter = file => {
            let basename = _path2.default.basename(file);
            return !(basename === "downloads" || basename === "uploaded" || basename === "skip" || basename === "fail" || uploadedFolder && basename === _path2.default.basename(uploadedFolder) || outputFolder && basename === _path2.default.basename(outputFolder) || basename === "tmp" || (0, _lodash.isArray)(uploaded) && uploaded.indexOf(_path2.default.posix.basename(file)) > -1);
        };

        // iterate through folders
        let batchFolders = [inputFolder];

        const next = () => {
            if (!batchFolders || !batchFolders.length) {
                return;
            }

            utils.lsFolder(batchFolders.splice(0, 1)[0], inputFilter, filetype, inputFolder).then(({ files, folders }) => {
                // Keep iterating though batch folders until one with files is found
                if (files && files.length) {
                    resolve(files); // Done. Resolve promise with new files
                    return;
                } else {
                    batchFolders = [...folders, ...batchFolders];
                    if (batchFolders.length) {
                        next(); // iterate
                    } else {
                        resolve(); // Done. No new files were found
                        return;
                    }
                }
            }).catch(err => {
                reject("Failed to check for new files: " + err.message);
            });
        };

        next(); // start first iteration
    });
};

const _get = exports._get = utils._get;
const _put = exports._put = utils._put;
const _post = exports._post = utils._post;
exports.default = utils;

module.exports.version = require("../package.json").version;