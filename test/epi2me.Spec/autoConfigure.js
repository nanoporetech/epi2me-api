"use strict";
const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const _              = require("lodash");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs');
let requestProxy   = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};
proxyquire('../../build/lib/utils', {
    'request' : requestProxy
});
var EPI2ME = proxyquire('../../build/lib/epi2me', {
    'aws-sdk'     : awsProxy,
    'fs-extra' : fsProxy,
    'mkdirp'      : mkdirpProxy
}).default;

describe('.autoConfigure method', () => {

    var conf = {
        inputFolder: "in",
        outputFolder: "out"
    };

    function newApi(error, instance) {
        var client = new EPI2ME(conf);

        client.uploadWorkerPool = {
            defer: () => {}
        };

        client._stats = {
            upload:   {
                success: 0,
                failure: {},
                queueLength: 0
            },
            download: {
                success: 0,
                fail: 0,
                failure: {},
                queueLength: 0
            }
        };

        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "error");
        sinon.stub(client, "enqueueUploadJob");
        sinon.stub(fsProxy, 'watch');
        return client;
    }

    // huh? no tests?
});
