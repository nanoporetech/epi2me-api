/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */

import axios   from "axios";
import crypto  from "crypto";
let utils = {};

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

utils._get = async (uri, options, cb) => {
    // do something to get/set data in epi2me
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

    try {
        let res = await axios.get(req.uri, req);
        utils._responsehandler(res, cb);
    } catch (res_e) {
        return cb(res_e, {});
    }
};

utils._post = async (uri, obj, options, cb) => {
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

    try {
        let res = await axios.post(req.uri, req);
        utils._responsehandler(res, cb);
    } catch (res_e) {
        return cb(res_e, {});
    }
};

utils._put = async (uri, id, obj, options, cb) => {
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

    try {
        let res = await axios.put(req.uri, req);
        utils._responsehandler(res, cb);
    } catch (res_e) {
        return cb(res_e, {});
    }
};

utils._responsehandler = (r, cb) => {
    let json;
    if (!cb) {
        throw new Error("callback must be specified");
    }

    let body = r ? r.data : "";
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

export const _get  = utils._get;
export const _put  = utils._put;
export const _post = utils._post;
export default utils;
module.exports.version = require("../package.json").version;
