/**
 * Created by ahurst on 17/05/2016.
 */
const request = require("request");
const crypto  = require("crypto");
const fs      = require('fs');

let utils = {};

utils._sign = function (req, options) {
    // common headers required for everything
    if(!req.headers) {
	req.headers = {};
    }
    if(!options) {
	options = {};
    }
    req.headers['X-EPI2ME-Client']  = options.user_agent;           // new world order
    req.headers['X-EPI2ME-Version'] = options.agent_version || '0'; // new world order
    req.headers['X-EPI2ME-ApiKey']  = options.apikey;               // better than a logged CGI parameter

    if(!options.apisecret) {
	return;
    }

    // timestamp mitigates replay attack outside a tolerance window determined by the server
    req.headers["X-EPI2ME-SignatureDate"] = (new Date).toISOString();

    var message = [req.uri,

		   Object.keys(req.headers)
		   .sort()
		   .map(function(o) {
		       return o+":"+req.headers[o];
		   })
		   .join("\n")

		  ].join("\n");

    let digest  = crypto.createHmac('sha1', options.apisecret).update(message).digest('hex');
    req.headers["X-EPI2ME-SignatureV0"] = digest;
}

utils._get = function (uri, options, cb) {
    // do something to get/set data in metrichor
    var call, req,
        srv = options.url;

    uri  = "/" + uri + ".js";
    srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
    call = srv + uri;
    req  = { uri: call };

    this._sign(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.get(req,
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._post = function (uri, id, obj, options, cb) {
    var srv, call, req, form = {};

    if (obj !== undefined) {
        form.json = JSON.stringify(obj); // fwiw portal > 2.47.1-538664 shouldn't require this as a named parameter any more
    }

    /* if id is an object, merge it into form post parameters */
    if (id && typeof id === 'object') {
        Object.keys(id).forEach(function (attr) {
            form[attr] = id[attr];
        });

        id = "";
    }

    srv  = options.url;
    srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
    call = srv + '/' + uri + (id ? "/"+id : "") + ".js";
    req  = {
        uri:  call,
        form: form
    };

    this._sign(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.post(req,
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._put = function (uri, id, obj, options, cb) {
    /* three-arg _put call (no parameters) */
    if (typeof obj === 'function') {
        cb = obj;
    }

    var srv, call, req,
        form = {
            json: JSON.stringify(obj)
        };

    srv  = options.url;
    srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
    call = srv + '/' + uri + '/' + id + '.js';
    req  = {
        uri:  call,
        form: form
    };

    this._sign(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.put(req,
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._responsehandler = function (res_e, r, body, cb) {
    var json, msg;

    if (!cb) {
	throw new Error("callback must be specified");
    }

    if (res_e) {
        return cb(res_e, {});
    }

    if (r && r.statusCode >= 400) {
        msg = "Network error " + r.statusCode;

        try {
            json = JSON.parse(body);
            if (json.error) {
                msg = json.error;
            }
        } catch (jsn_e) {
        }

        if (r.statusCode === 504) {
            // always override 504 with something custom
            msg = "Please check your network connection and try again.";
        }

        return cb({"error": msg});
    }

    try {
        json = JSON.parse(body);

    } catch (jsn_e) {
        if (cb) {
            return cb(jsn_e, {});
        }
        return;
    }

    if (json.error) {
        return cb({"error": json.error}, {});
    }

    return cb(null, json);
};

utils.chunk = function chunk(files, desiredChunkLength) {
    /** split array into into chunks of size len */
    let chunks = []
    let i = 0
    let n = files.length

    while (i < n) {
        chunks.push(files.slice(i, i += desiredChunkLength));
    }

    return chunks;
};

utils.countFileReads = function (filePath) {
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


module.exports = utils;
module.exports.version = '2.48.4';
