/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const request = require("request");
const progress = require("request-progress");
const crypto = require("crypto");
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
let utils = {};

const targetBatchSize = 4000;

utils._headers = (req, options) => {
    // common headers required for everything
    if (!options) {
        options = {};
    }

    req.headers = Object.assign({}, {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-EPI2ME-Client": options.user_agent || "", // new world order
        "X-EPI2ME-Version": options.agent_version || "0" // new world order
    }, req.headers);

    if (options._signing !== false) {
        utils._sign(req, options);
    }

    return;
};

utils._sign = (req, options) => {
    // common headers required for everything
    if (!req.headers) {
        req.headers = {};
    }

    if (!options) {
        options = {};
    }

    req.headers["X-EPI2ME-ApiKey"] = options.apikey; // better than a logged CGI parameter

    if (!options.apisecret) {
        return;
    }

    // timestamp mitigates replay attack outside a tolerance window determined by the server
    req.headers["X-EPI2ME-SignatureDate"] = new Date().toISOString();

    if (req.uri.match(/^https:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:443/, "");
    }

    if (req.uri.match(/^http:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:80/, "");
    }

    let message = [req.uri, Object.keys(req.headers).sort().filter(o => {
        return o.match(/^x-epi2me/i);
    }).map(o => {
        return o + ":" + req.headers[o];
    }).join("\n")].join("\n");

    let digest = crypto.createHmac("sha1", options.apisecret).update(message).digest("hex");
    req.headers["X-EPI2ME-SignatureV0"] = digest;
};

utils._get = (uri, options, cb) => {
    // do something to get/set data in epi2me
    let call,
        srv = options.url;

    if (!options.skip_url_mangle) {
        uri = "/" + uri; // + ".json";
        srv = srv.replace(/\/+$/, ""); // clip trailing slashes
        uri = uri.replace(/\/+/g, "/"); // clip multiple slashes
        call = srv + uri;
    } else {
        call = uri;
    }

    let req = { uri: call, gzip: true };

    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.get(req, (res_e, res, body) => {
        utils._responsehandler(res_e, res, body, cb);
    });
};

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
        progress(request(req), {}).on("progress", progressCb).on("end", cb).pipe(fs.createWriteStream(filepath));
    } else {
        request(req).pipe(fs.createWriteStream(filepath)).on("close", cb);
    }
};

utils._post = (uri, obj, options, cb) => {
    let srv = options.url;
    srv = srv.replace(/\/+$/, ""); // clip trailing slashes
    uri = uri.replace(/\/+/g, "/"); // clip multiple slashes
    let call = srv + "/" + uri;

    let req = {
        uri: call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {}
    };

    if (options.legacy_form) {
        // include legacy form parameters
        let form = {};
        form.json = JSON.stringify(obj);

        if (obj && typeof obj === "object") {
            Object.keys(obj).forEach(attr => {
                form[attr] = obj[attr];
            });
        } // garbage

        req.form = form;
    }

    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.post(req, (res_e, res, body) => {
        utils._responsehandler(res_e, res, body, cb);
    });
};

utils._put = (uri, id, obj, options, cb) => {
    let srv = options.url;
    srv = srv.replace(/\/+$/, ""); // clip trailing slashes
    uri = uri.replace(/\/+/g, "/"); // clip multiple slashes
    let call = srv + "/" + uri + "/" + id;
    let req = {
        uri: call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {}
    };

    if (options.legacy_form) {
        // include legacy form parameters
        req.form = { json: JSON.stringify(obj) };
    }
    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.put(req, (res_e, res, body) => {
        utils._responsehandler(res_e, res, body, cb);
    });
};

utils._responsehandler = (res_e, r, body, cb) => {
    let json;

    if (!cb) {
        throw new Error("callback must be specified");
    }

    if (res_e) {
        return cb(res_e, {});
    }

    let jsn_e;
    try {
        body = body.replace(/[^]*\n\n/, ""); // why doesn't request always parse headers? Content-type with charset?
        json = JSON.parse(body);
    } catch (err) {
        jsn_e = err;
    }

    if (r && r.statusCode >= 400) {
        let msg = "Network error " + r.statusCode;
        if (json && json.error) {
            msg = json.error;
        } else if (jsn_e) {
            //   msg = jsn_e;
        }

        if (r.statusCode === 504) {
            // always override 504 with something custom
            msg = "Please check your network connection and try again.";
        }

        return cb({ "error": msg });
    }

    if (jsn_e) {
        return cb({ "error": jsn_e }, {});
    }

    if (json.error) {
        return cb({ "error": json.error }, {});
    }

    return cb(null, json);
};

utils.countFileReads = filePath => {
    return new Promise((resolve, reject) => {
        const LINES_PER_READ = 4;
        let lineCount = 1;
        let idx;
        fs.createReadStream(filePath).on("data", buffer => {
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
    fs.mkdirpSync(folder);
    const prefix = "batch_";
    const createBatch = () => {
        const batchName = `${prefix}${Date.now()}`;
        const newBatchPath = path.join(folder, batchName);
        fs.mkdirpSync(newBatchPath);
        return newBatchPath;
    };
    let batches = fs.readdirSync(folder).filter(d => d.slice(0, prefix.length) === prefix);

    if (!batches || !batches.length) return createBatch();
    const latestBatch = path.join(folder, batches.pop());
    if (fs.readdirSync(latestBatch).length < targetBatchSize) {
        return latestBatch;
    }
    return createBatch();
};

let ID_counter = 0;
utils.getFileID = () => `FILE_${++ID_counter}`;

utils.lsFolder = (dir, ignore, filetype, rootDir = "") => {
    return fs.readdir(dir).then(ls => {
        if (ignore) {
            ls = ls.filter(ignore);
        }

        let folders = [];
        let files = [];
        let promises = [];

        ls.forEach(entry => {
            promises.push(fs.stat(path.join(dir, entry)).then(stats => {
                if (stats.isDirectory()) {
                    folders.push(path.join(dir, entry));
                    return Promise.resolve();
                }

                if (stats.isFile() && (!filetype || path.extname(entry) === filetype)) {
                    /** For each file, construct a file object: */
                    let parsed = path.parse(entry);

                    let fileObject = {
                        name: parsed.base,
                        path: path.join(dir, entry),
                        size: stats.size,
                        id: utils.getFileID()
                    };

                    let batch = dir.replace(rootDir, "").replace("\\", "").replace("/", "");
                    if (_.isString(batch) && batch.length) fileObject.batch = batch;
                    files.push(fileObject);
                    return Promise.resolve();
                }

                return Promise.resolve(); // unhandled type. ignore? reject?
            }));
        });

        return Promise.all(promises).then(() => {
            folders = folders.sort();
            /**
             * // It's important to load the batch folders alphabetically
             * 1, then 2, ect.
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
            return !(path.basename(file) === "downloads" || path.basename(file) === "uploaded" || path.basename(file) === "skip" || path.basename(file) === "fail" || uploadedFolder && path.basename(file) === path.basename(uploadedFolder) || outputFolder && path.basename(file) === path.basename(outputFolder) || path.basename(file) === "tmp" || _.isArray(uploaded) && uploaded.indexOf(path.posix.basename(file)) > -1);
        };

        // iterate through folders
        let batchFolders = [inputFolder];

        const next = () => {
            if (!batchFolders || !batchFolders.length) return;
            utils.lsFolder(batchFolders.splice(0, 1)[0], inputFilter, filetype, inputFolder).then(({ files, folders }) => {
                // Keep iterating though batch folders until one with files is found
                if (files && files.length) {
                    resolve(files); // Done. Resolve promise with new files
                } else {
                    batchFolders = [...folders, ...batchFolders];
                    if (batchFolders.length) {
                        next(); // iterate
                    } else {
                        resolve(); // Done. No new files were found
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