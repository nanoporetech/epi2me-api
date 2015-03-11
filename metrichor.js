// Author:        rpettett
// Last Maintained: $Author$
// Last Modified: $Date$
// Id:            $Id$
// $HeadURL$
// $LastChangedRevision$
// $Revision$

/* potentially of interest *FOR INTERNAL USE ONLY*
 * http://stackoverflow.com/questions/10888610/ignore-invalid-self-signed-ssl-certificate-in-node-js-with-https-request
 * 
 * request parameters:
 *   rejectUnauthorized: false,
 *   requestCert: true,
 *   agent: false,
 *
 * FOR PROXY SUPPORT USE ENVIRONMENT VARIABLES http_proxy/https_proxy
 *
 */
/*jslint nomen: true*/
/*global require, module */

var fs         = require('fs');
var extRequest = require('request');

function metrichor(opt_string) {
    "use strict";
    opt_string = opt_string || '{}';
    var opts;

    if (typeof opt_string === 'string' ||
            (typeof opt_string === "object" &&
            opt_string.constructor === String)) {
        opts = JSON.parse(opt_string);
    } else {
        opts = opt_string;
    }

    this._url           = opts.url || 'https://metrichor.com';
    this._apikey        = opts.apikey;
    this._agent_version = opts.agent_version;

    return this;
}

module.exports = metrichor;
module.exports.version = '0.4.0';

metrichor.prototype = {
    _accessor : function (field, value) {
        "use strict";
        var store = '_' + field;
        if (value !== undefined) {
            this[store] = value;
        }
        return this[store];
    },

    url : function (url) {
        "use strict";
        return this._accessor('url', url);
    },

    apikey : function (apikey) {
        "use strict";
        return this._accessor('apikey', apikey);
    },

    user : function (cb) {
        "use strict";
        return this._get('user', cb);
    },

    workflows : function (cb) {
        "use strict";
        return this._list('workflow', cb);
    },

    workflow : function (id, obj, cb) {
        "use strict";

        if (!cb) {
            // two args: get object
            cb = obj;
            return this._read('workflow', id, cb);
        }

        // three args: update object
        return this._post('workflow', id, obj, cb);
    },

    start_workflow : function (workflow_id, cb) {
        "use strict";
        return this._post('workflow_instance', null, { "workflow": workflow_id }, cb);
    },

    stop_workflow : function (instance_id, cb) {
        "use strict";
        return this._put('workflow_instance/stop', instance_id, cb);
    },

    workflow_instances : function (cb) {
        "use strict";
        return this._list('workflow_instance', cb);
    },

    workflow_instance : function (id, cb) {
        "use strict";
        return this._read('workflow_instance', id, cb);
    },

    token : function (cb) { /* should this be passed a hint at what the token is for? */
        "use strict";
        return this._post('token', null, {}, cb);
    },

    telemetry : function (id_workflow_instance, obj, cb) {
        "use strict";
        if (cb === null) {
            // two args: get object
            cb = obj;
            return this._read('workflow_instance/telemetry', id_workflow_instance, cb);
        }

        // three args: update object
        return this._post('workflow_instance/telemetry', id_workflow_instance, obj, cb);
    },

    _list : function (entity, cb) {
        "use strict";
        return this._get(entity, function (e, json) {
            cb(e, json[entity + "s"]);
        });
    },

    _read : function (entity, id, cb) {
        "use strict";
        return this._get(entity + '/' + id, cb);
    },

    _get : function (uri, cb) {
        "use strict";
        // do something to get/set data in metrichor
        var call, mc,
            srv = this.url();

        uri = "/" + uri + ".js?apikey=" + this.apikey();
        srv = srv.replace(/\/+$/, ""); // clip trailing /s
        uri = uri.replace(/\/+/g, "/");

        if (this._agent_version) {
            uri = uri + ";agent_version=" + this._agent_version;
        }

        call = srv + uri;
        mc   = this;

        extRequest.get(
            {
                uri   : call,
            },
            function (e, r, body) {
                mc._responsehandler(e, r, body, cb);
            }
        );
    },

    _post : function (uri, id, obj, cb) {
        "use strict";
        var srv, call, mc,
            form = {
                apikey: this.apikey(),
                json:   JSON.stringify(obj)
            };

        if (this._agent_version) {
            form.agent_version = this._agent_version;
        }

        /* if id is an object, merge it into form post parameters */
        if (id && typeof id === 'object') {
            Object.keys(id).forEach(function (attr) {
                form[attr] = id[attr];
            });

            id = "";
        }

        srv  = this.url();
        srv  = srv.replace(/\/+$/, ""); // clip trailing /s
        uri  = uri.replace(/\/+/g, "/");
        call = srv + '/' + uri;
        mc   = this;

        if (id) {
            call = call + '/' + id;
        }
        call += '.js';

        extRequest.post(
            {
                uri   : call,
                form  : form,
            },
            function (e, r, body) {
                mc._responsehandler(e, r, body, cb);
            }
        );
    },

    _put : function (uri, id, obj, cb) {
        "use strict";
        /* three-arg _put call (no parameters) */
        if (typeof obj === 'function') {
            cb = obj;
        }

        var srv, call, mc,
            form = {
                apikey: this.apikey(),
                json:   JSON.stringify(obj)
            };

        if (this._agent_version) {
            form.agent_version = this._agent_version;
        }

        srv  = this.url();
        srv  = srv.replace(/\/+$/, ""); // clip trailing /s
        uri  = uri.replace(/\/+/g, "/");
        call = srv + '/' + uri + '/' + id + '.js';
        mc   = this;

        extRequest.put(
            {
                uri   : call,
                form  : form,
            },
            function (e, r, body) {
                mc._responsehandler(e, r, body, cb);
            }
        );
    },

    _responsehandler : function (res_e, r, body, cb) {
        "use strict";
        if (res_e) {
            return cb(res_e, {});
        }

        if (r && r.statusCode >= 400) {
            return cb({"error": "HTTP status " + r.statusCode}, {});
        }

        var json;
        try {
            json = JSON.parse(body);

        } catch (jsn_e) {
            return cb(jsn_e, {});
        }

        if (json.error) {
            return cb({"error": json.error}, {});
        }

        return cb(null, json);
    }
};
