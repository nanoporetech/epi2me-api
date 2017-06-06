/**
 * Created by ahurst on 17/05/2016.
 */
const request  = require("request");
const HmacSHA1 = require("crypto-js/hmac-sha1");

let utils = {};

utils._sign = function (req) {
    if(!this.secret) {
	return;
    }
    var message = [req.uri, Object.keys(req.headers).sort().map(function(o) { return o+":"+req.headers.o }).join("\n")].join("\n");
    let digest  = HmacSHA1(message, this.secret);
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
    req  = {
        uri:     call,
        headers: {
            'X-EPI2ME-Client':  options.user_agent,           // new world order
            'X-EPI2ME-Version': options.agent_version || '0', // new world order
	    'X-EPI2ME-ApiKey':  options.apikey                // better than a logged CGI parameter
        }
    };
    this._sign(req);

    if(options.proxy) {
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
        uri:     call,
        form:    form,
        headers: {
            'X-EPI2ME-Client':  options.user_agent,           // new world order
            'X-EPI2ME-Version': options.agent_version || '0', // new world order
	    'X-EPI2ME-ApiKey':  options.apikey                // better than a logged CGI parameter
        }
    };
    this._sign(req);

    if(options.proxy) {
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
            json:   JSON.stringify(obj)
        };

    srv  = options.url;
    srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
    call = srv + '/' + uri + '/' + id + '.js';
    req  = {
        uri   : call,
        form  : form,
        headers: {
            'X-EPI2ME-Client':  options.user_agent,           // new world order
            'X-EPI2ME-Version': options.agent_version || '0', // new world order
	    'X-EPI2ME-ApiKey':  options.apikey                // better than a logged CGI parameter
        }
    };
    this._sign(req);

    if(options.proxy) {
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
    if (res_e) {
        if (cb) {
            cb(res_e, {});
        }
        return;
    }

    if (r && r.statusCode >= 400) {
	msg = "Network error " + r.statusCode;

	try {
	    json = JSON.parse(body);
	    if(json.error) {
		msg = json.error;
	    }
	} catch (jsn_e) {
	}

        if (r.statusCode === 504) {
	    // always override 504 with something custom
            msg = "Please check your network connection and try again.";
	}

	if(cb) {
	    return cb({"error": msg});
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
