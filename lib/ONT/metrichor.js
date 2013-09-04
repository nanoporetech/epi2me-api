// Author:        rpettett
// Last Maintained: $Author$
// Last Modified: $Date$
// Id:            $Id$
// $HeadURL$
// $LastChangedRevision$
// $Revision$

module.exports = metrichor;
module.exports.version = '0.1';

var extRequest = require('request');

function metrichor (opt_string) {
    this.className = 'metrichor';
    opt_string = opt_string || '{}';
    var opts;
    if ( typeof(opt_string) === 'string' ||
         (typeof opt_string == "object" &&
          opt_string.constructor === String) ) {
        opts = JSON.parse(opt_string);
    } else {
        opts = opt_string;
    }
  
    this._url    = opts.url ? opts.url : 'http://metrichor.oxfordnanolabs.local';
    this._apikey = opts.apikey;
};

metrichor.prototype = {
    _accessor : function(field, value) {
        var store = '_'+field;
        if ( typeof value !== 'undefined' ) {
            this[store] = value;
        }
        return this[store];
    },
    url : function(url) {
        return this._accessor('url', url);
    },
    apikey : function(apikey) {
        return this._accessor('apikey', apikey);
    },

    workflows : function(cb) {
        return this._list('workflow', cb);
    },

    workflow  : function(id, obj, cb) {
        if(cb == null) {
            // two args: get object
            cb=obj;
            return this._read('workflow', id, cb);
        } else {
            // three args: update object
            return this._post('workflow', id, obj, cb);
        }
    },

    start_workflow : function(workflow_id, cb) {
        return this._post('workflow_instance', null, { "workflow": workflow_id }, cb);
    },

    stop_workflow : function(instance_id, cb) {
        return this._put('workflow_instance/stop', instance_id, cb);
    },

    _list : function ( entity, cb ) {
        return this._get( entity, function(e, json) {
            cb(e, json[entity+"s"]);
        });
    },

    _read : function ( entity, id, cb ) {
        return this._get ( entity + '/' + id, cb );
    },

    _get : function (uri, cb) {
        // do something to get/set data in metrichor
        var call = this.url() + '/' + uri + '.js?apikey='+this.apikey();
        var mc   = this;

        extRequest.get(
            { 'uri' : call },
            function(e,r,body){mc._responsehandler(e,r,body,cb)}
        );
    },

    _post : function(uri, id, obj, cb) {
        var call = this.url() + '/' + uri;
	if(id) {
	    call = call + '/' + id;
	}
	call += '.js';

        var mc   = this;
        extRequest.post({
                        'uri'    : call,
                        'form'   : {
			            'apikey' : this.apikey(),
			            'json'   : JSON.stringify(obj)
                                   },
                        },
                        function(e,r,body){mc._responsehandler(e,r,body,cb)}
                       )
    },

    _put : function(uri, id, cb) {
        var call = this.url() + '/' + uri + '/' + id + '.js';
        var mc   = this;
        extRequest.put({
                        'uri'    : call,
                        'form'   : {
			            'apikey' : this.apikey(),
                                   },
                       },
                       function(e,r,body){mc._responsehandler(e,r,body,cb)}
                      );
    },

    _responsehandler : function(e,r,body, cb) {
        if ( e ) {
            return cb(e, {});
        }
        var json;
        try {
            json=JSON.parse(body);
        }
        catch(e) {
            return cb(e, {});
        }

        if(json.error) {
            return cb({"error":json.error}, {});
        }

        return cb(e, json);
    }
};
