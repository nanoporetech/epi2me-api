/**
 * Created by ahurst on 17/05/2016.
 */
const request = require("request");
let utils = {};

utils._get = function (uri, options, cb) {
    // do something to get/set data in metrichor
    var call,
        srv = options.url;

    uri = "/" + uri + ".js?apikey=" + options.apikey;
    srv = srv.replace(/\/+$/, ""); // clip trailing /s
    uri = uri.replace(/\/+/g, "/");

    if (options.agent_version) {
        uri = uri + ";agent_version=" + options.agent_version;
    }

    call = srv + uri;

    request.get(
        {
            uri   : call,
            proxy : options.proxy,
            headers: {
                'X-Metrichor-Client': options.user_agent
            }
        },
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._post = function (uri, id, obj, options, cb) {
    var srv, call,
        form = {
            apikey: options.apikey
        };

    if (obj !== undefined) form.json = JSON.stringify(obj);
    if (options.agent_version) form.agent_version = options.agent_version;

    /* if id is an object, merge it into form post parameters */
    if (id && typeof id === 'object') {
        Object.keys(id).forEach(function (attr) {
            form[attr] = id[attr];
        });

        id = "";
    }

    srv  = options.url;
    srv  = srv.replace(/\/+$/, ""); // clip trailing /s
    uri  = uri.replace(/\/+/g, "/");
    call = srv + '/' + uri;

    if (id) call = call + '/' + id;
    call += '.js';

    request.post(
        {
            uri   : call,
            form  : form,
            proxy : options.proxy,
            headers: {
                'X-Metrichor-Client': options.user_agent
            }
        },
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

    var srv, call,
        form = {
            apikey: options.apikey,
            json:   JSON.stringify(obj)
        };

    if (options.agent_version) {
        form.agent_version = options.agent_version;
    }

    srv  = options.url;
    srv  = srv.replace(/\/+$/, ""); // clip trailing /s
    uri  = uri.replace(/\/+/g, "/");
    call = srv + '/' + uri + '/' + id + '.js';

    request.put(
        {
            uri   : call,
            form  : form,
            proxy : options.proxy,
            headers: {
                'X-Metrichor-Client': options.user_agent
            }
        },
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._responsehandler = function (res_e, r, body, cb) {
    var json;
    if (res_e) {
        if (cb) {
            cb(res_e, {});
        }
        return;
    }

    if (r && r.statusCode >= 400) {
        if (cb) {
            if (r.statusCode === 504) {
                cb({"error": "please check your network connection and try again."});
            } else {
                cb({"error": "Network error " + r.statusCode});
            }

        }
        return;
    }

    try {
        json = JSON.parse(body);

    } catch (jsn_e) {
        if (cb) {
            cb(jsn_e, {});
        }
        return;
    }

    if (json.error) {
        if (cb) {
            cb({"error": json.error}, {});
        }
        return;
    }

    if (cb) {
        cb(null, json);
    }
};

utils.chunk = function chunk (files, desiredChunkLength) {
    /** split array into into chunks of size len */
    let chunks = []
    let i = 0
    let n = files.length

    while (i < n) {
        chunks.push(files.slice(i, i += desiredChunkLength));
    }

    return chunks;
};

module.exports = utils;