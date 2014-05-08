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
 *   proxy: "https://myproxy.com:3128/"
 */

module.exports = metrichor;
module.exports.version = '0.3.6';

var fs         = require('fs');
var extRequest = require('request');
var path       = require('path');

function metrichor (opt_string) {
    this.className = 'metrichor';
    opt_string = opt_string || '{}';
    var opts;

    if ( typeof opt_string === 'string' ||
	 (typeof opt_string === "object" &&
          opt_string.constructor === String) ) {
	opts = JSON.parse(opt_string);
    } else {
	opts = opt_string;
    }

    this._url    = opts.url ? opts.url : 'https://metrichor.com';
    this._apikey = opts.apikey;
    this._proxy  = opts.proxy;
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

    user : function(cb) {

	return this._get('user', cb);
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
  
    workflow_instances : function(cb) {
    
	return this._list('workflow_instance', cb);
    },
  
    workflow_instance : function(id, cb) {
    
	return this._read('workflow_instance', id, cb);
    },
    
    telemetry : function(id_workflow_instance, obj, cb) {
    
	if(cb == null) {
	    // two args: get object
	    cb=obj;
	    return this._read('workflow_instance/telemetry', id_workflow_instance, cb);
      
	} else {
	    // three args: update object
	    return this._post('workflow_instance/telemetry', id_workflow_instance, obj, cb);
	}
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
	var srv  = this.url();
	srv      = srv.replace(/\/+$/, ""); // clip trailing /s
	var uri  = '/' + uri + '.js?apikey='+this.apikey();
	uri      = uri.replace(/\/+/g, "/");
	var call = srv + uri;
	var mc   = this;
    
	extRequest.get(
	    {
		uri   : call,
		proxy : this._proxy
	    },
	    function (e,r,body) { mc._responsehandler( e,r,body,cb ) }
	);
    },
  
    _post : function(uri, id, obj, cb) {
    
	var form = {
	    'apikey' : this.apikey(),
	    'json'   : JSON.stringify(obj)
	};
      
	/* if id is an object, merge it into form post parameters */
	if(typeof id === 'object') {
	    for (var attr in id) {
		form[attr] = id[attr];
	    }
	    id="";
	}
      
	var srv  = this.url();
	srv      = srv.replace(/\/+$/, ""); // clip trailing /s
	uri      = uri.replace(/\/+/g, "/");
	var call = srv + '/' + uri;
      
	if ( id ) {
	    call = call + '/' + id;
	}
	call += '.js';
      
	var mc   = this;
      
	extRequest.post(
	    {
		uri   : call,
		form  : form,
		proxy : this._proxy
	    },
	    function ( e,r,body ){ mc._responsehandler( e,r,body,cb ) }
	);
    },

    _put : function(uri, id, obj, cb) {

	/* three-arg _put call (no parameters) */
	if(typeof obj === 'function') {
	    cb = obj;
	}
    
	var form = {
	    'apikey' : this.apikey(),
	    'json'   : JSON.stringify(obj)
	};

	var srv  = this.url();
	srv      = srv.replace(/\/+$/, ""); // clip trailing /s
	uri      = uri.replace(/\/+/g, "/");
	var call = srv + '/' + uri + '/' + id + '.js';
	var mc   = this;
	extRequest.put(
	    {
		uri   : call,
		form  : form,
		proxy : this._proxy
	    },
	    function ( e,r,body ){ mc._responsehandler( e,r,body,cb ) }
	);
    },
  
    _responsehandler : function(e,r,body, cb) {
	if ( res_e ) {
	    return cb( res_e, {} );
	}

	var json;
	try {
	    json=JSON.parse( body );

	} catch(jsn_e) {
	    return cb( jsn_e, {} );
	}
    
	if ( json.error ) {
	    return cb({"error": json.error}, {});
	}
    
	return cb(null, json);
    }
};
