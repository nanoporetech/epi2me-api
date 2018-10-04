/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */
"use strict";
const request  = require("request");
const progress = require("request-progress");
const crypto   = require("crypto");
const fs       = require("fs-extra");
const path     = require("path");
const queue    = require("queue-async");
const _        = require("lodash");
let utils      = {};

const targetBatchSize = 4000;

utils._headers = (req, options) => {
    // common headers required for everything
    if(!req.headers) {
        req.headers = {};
    }

    if(!options) {
        options = {};
    }

    req.headers["Accept"]           = "application/json";
    req.headers["Content-Type"]     = "application/json";
    req.headers["X-EPI2ME-Client"]  = options.user_agent    || "";  // new world order
    req.headers["X-EPI2ME-Version"] = options.agent_version || "0"; // new world order

    if(options._signing !== false) {
        utils._sign(req, options);
    }

    return;
};

utils._sign = (req, options) => {
    // common headers required for everything
    if(!req.headers) {
        req.headers = {};
    }

    if(!options) {
        options = {};
    }

    req.headers["X-EPI2ME-ApiKey"]  = options.apikey;               // better than a logged CGI parameter

    if(!options.apisecret) {
        return;
    }

    // timestamp mitigates replay attack outside a tolerance window determined by the server
    req.headers["X-EPI2ME-SignatureDate"] = (new Date()).toISOString();

    if(req.uri.match(/^https:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:443/,"");
    }

    if(req.uri.match(/^http:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:80/,"");
    }

    let message = [req.uri,

        Object.keys(req.headers)
            .sort()
            .filter((o) => { return o.match(/^x-epi2me/i); })
            .map((o) => {
                return o + ":" + req.headers[o];
            })
            .join("\n")

    ].join("\n");

    let digest  = crypto.createHmac("sha1", options.apisecret).update(message).digest("hex");
    req.headers["X-EPI2ME-SignatureV0"] = digest;
};

utils._get = (uri, options, cb) => {
    // do something to get/set data in metrichor
    let call,
        srv = options.url;

    if(!options.skip_url_mangle) {
        uri  = "/" + uri;// + ".json";
        srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
        uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
        call = srv + uri;
    } else {
        call = uri;
    }

    let req = { uri: call, gzip: true };

    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.get(req,
        (res_e, res, body) => {
            utils._responsehandler(res_e, res, body, cb);
        });
};

utils._pipe = (uri, filepath, options, cb, progressCb) => {
    let srv  = options.url;
    uri      = "/" + uri;                // note no forced extension for piped requests
    srv      = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri      = uri.replace(/\/+/g, "/"); // clip multiple slashes
    let call = srv + uri;
    let req  = {
        uri: call,
        gzip: true
    };

    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    if(progressCb) {
        progress(request(req), {})
            .on("progress", progressCb)
            .on("end", cb)
            .pipe(fs.createWriteStream(filepath));
    } else {
        request(req)
            .pipe(fs.createWriteStream(filepath))
            .on("close", cb);
    }
};

utils._post = (uri, obj, options, cb) => {
    let srv  = options.url;
    srv      = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri      = uri.replace(/\/+/g, "/"); // clip multiple slashes
    let call = srv + "/" + uri;

    let req  = {
        uri:  call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {}
    };

    if(options.legacy_form) {
        // include legacy form parameters
        let form = {};
        form.json = JSON.stringify(obj);

        if (obj && typeof obj === "object") {
            Object.keys(obj).forEach((attr) => {
                form[attr] = obj[attr];
            });
        } // garbage

        req.form = form;
    }

    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.post(req,
        (res_e, res, body) => {
            utils._responsehandler(res_e, res, body, cb);
        });
};

utils._put = (uri, id, obj, options, cb) => {
    let srv  = options.url;
    srv      = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri      = uri.replace(/\/+/g, "/"); // clip multiple slashes
    let call = srv + "/" + uri + "/" + id;
    let req  = {
        uri:  call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {}
    };

    if(options.legacy_form) {
        // include legacy form parameters
        req.form = {json: JSON.stringify(obj)};
    }
    utils._headers(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.put(req,
        (res_e, res, body) => {
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
        } else if(jsn_e) {
            //   msg = jsn_e;
        }

        if (r.statusCode === 504) {
            // always override 504 with something custom
            msg = "Please check your network connection and try again.";
        }

        return cb({"error": msg});
    }

    if (jsn_e) {
        return cb({"error": jsn_e}, {});
    }

    if (json.error) {
        return cb({"error": json.error}, {});
    }

    return cb(null, json);
};

utils.chunk = (files, desiredChunkLength) => {
    /** split array into into chunks of size len */
    let chunks = [];
    let i = 0;
    let n = files.length;

    while (i < n) {
        chunks.push(files.slice(i, i += desiredChunkLength));
    }

    return chunks;
};

utils.countFileReads = (filePath) => {
    return new Promise((resolve, reject) => {
        const LINES_PER_READ = 4;
        let lineCount = 1;
        let idx;
        fs.createReadStream(filePath)
            .on("data", (buffer) => {
                idx = -1;
                lineCount--;
                do {
                    idx = buffer.indexOf(10, idx + 1);
                    lineCount++;
                } while (idx !== -1);
            })
            .on("end", () => resolve(Math.floor(lineCount / LINES_PER_READ)))
            .on("error", reject);
    });
};

utils.getFileSize = (filename) => {
    return new Promise((resolve, reject) => {
        fs.stat(filename, (err, stats) => {
            if (err) {
                reject("failed to fs.stat file: " + err);
            } else if (stats) {
                resolve(stats.size || 0);
            }
        });
    });
};

// this isn't good... wtf:
// make async!
utils.findSuitableBatchIn = (folder) => {
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
    return new Promise((onSuccess, onError) => {
        fs.readdir(dir, (err, ls) => {
            if (err) {
                if (err.Error && err.Error.match(/ENOENT/)) {
                    console.error(err.Error); // eslint-disable-line no-console
                }
                onError(err);

            } else {

                if (ignore) {
                    ls = ls.filter(ignore);
                }

                let folders    = [];
                let files      = [];
                let fileSizeQ  = queue(10);

                ls.forEach(entry => {
                    fileSizeQ.defer(done => {
                        fs.stat(path.join(dir, entry), (err, stats) => {
                            if (!err && stats) {
                                if (stats.isFile() && (!filetype || path.extname(entry) === filetype)) {
                                    /** For each file, construct a file object: */
                                    let parsed = path.parse(entry);

                                    let fileObject = {
                                        name: parsed.base,
                                        path: path.join(dir, entry),
                                        size: stats.size,
                                        id: utils.getFileID()
                                    };

                                    let batch = dir.replace(rootDir, "").replace("\\", "").replace("/","");
                                    if (_.isString(batch) && batch.length) fileObject.batch = batch;
                                    files.push(fileObject);

                                } else if (stats.isDirectory()) {
                                    folders.push(path.join(dir, entry));
                                }
                            }
                            done();
                        });
                    });
                });

                fileSizeQ.awaitAll(() => {
                    folders = folders.sort();
                    /**
                     * // It's important to load the batch folders alphabetically
                     * 1, then 2, ect.
                     */
                    onSuccess({ files, folders });
                });
            }
        });
    });
};


utils.loadInputFiles = ({inputFolder, outputFolder, uploadedFolder, filetype}, uploaded = []) => {
    /**
     * Entry point for new .fast5 / .fastq files.
     *  - Scan the input folder files
     *      fs.readdir is resource-intensive if there are a large number of files
     *      It should only be triggered when needed
     *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
     */

    return new Promise((onSuccess, onError) => {

        // function used to filter the readdir results in utils.lsFolder
        // exclude all files and folders meet any of these criteria:
        const inputFilter = (file) => {
            return !(
                path.basename(file) === "downloads" ||
                path.basename(file) === "uploaded" ||
                path.basename(file) === "skip" ||
                path.basename(file) === "fail" ||
                uploadedFolder && path.basename(file) === path.basename(uploadedFolder) ||
                outputFolder && path.basename(file) === path.basename(outputFolder) ||
                path.basename(file) === "tmp" ||
                (_.isArray(uploaded) && uploaded.indexOf(path.posix.basename(file)) > -1));
        };

        // iterate through folders
        let batchFolders = [ inputFolder ];

        const next = () => {
            if (!batchFolders || !batchFolders.length) return;
            utils.lsFolder(batchFolders.splice(0, 1)[0], inputFilter, filetype, inputFolder)
                .then(({ files, folders }) => {
                    // Keep iterating though batch folders until one with files is found
                    if (files && files.length) {
                        onSuccess(files); // Done. Resolve promise with new files
                    } else {
                        batchFolders = [ ...folders, ...batchFolders ];
                        if (batchFolders.length) {
                            next(); // iterate
                        } else {
                            onSuccess(); // Done. No new files were found
                        }
                    }
                })
                .catch(err => {
                    onError("Failed to check for new files: " + err.message);
                });
        };

        next(); // start first iteration
    });
};

module.exports = utils;
module.exports.version = require("../package.json").version;
