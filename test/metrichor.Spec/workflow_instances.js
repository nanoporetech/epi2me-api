"use strict";
const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const _              = require("lodash");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs');
let utilsProxy     = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};
var EPI2ME = proxyquire('../../lib/metrichor.js', {
    'aws-sdk'     : awsProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'      : mkdirpProxy,
    './utils.js'  : utilsProxy,
});

describe('workflow_instances', () => {

    it('should list workflow_instances', () => {
        var client = new EPI2ME({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

        utilsProxy._get = function(uri, options, cb) {
            assert.equal(uri, "workflow_instance");
            assert.equal(options.apikey, "FooBar02");
            cb(null, {"workflow_instances":[{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}]});
        };

        client.workflow_instances(function(err, obj) {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, [{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}], 'workflow instance list');
        });
    });
});
