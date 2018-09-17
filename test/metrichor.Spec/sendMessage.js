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
proxyquire('../../lib/utils', {
    'request' : requestProxy
});
var EPI2ME;

describe('metrichor api', () => {

    beforeEach(() => {
        EPI2ME = proxyquire('../../lib/metrichor.js', {
            'aws-sdk'     : awsProxy,
            'fs-extra' : fsProxy,
            'mkdirp'      : mkdirpProxy
        });
    });

    describe('.sendMessage method', () => {

        var client;

        beforeEach(() => {
            fsProxy.rename = () => {};
            mkdirpProxy = () => {};

            client = new EPI2ME({
                inputFolder: 'path'
            });
            client.workflow_instance = function (id, cb) {
                cb(error, instance);
            };

            client.autoConfigure = function (id, cb) {
                cb();
            };

            sinon.stub(client.log, "warn");
            sinon.stub(client.log, "info");
        });

        afterEach(() => {
            // Cleanup
            delete fsProxy.rename;
            delete awsProxy.SQS;
            mkdirpProxy = {};
        });

        it('sqs callback should handle error and log warning', () => {
            var item     = 'filename.fast5',
                objectId = 'PREFIX/'+item,
                sqsMock  = {
                    sendMessage: (err, cb) => {
                        cb("Error message");
                        assert(client.log.warn.calledOnce);
                    }
                };

            client.sendMessage(sqsMock, objectId, item, () => {});
        });

        it('sqs callback should move file to the ./uploaded folder', () => {
            var item     = 'filename.fast5',
                objectId = 'PREFIX/'+item,
                sqsMock  = {
                    sendMessage: () => {}
                };

            client.sendMessage(sqsMock, objectId, item, () => {});

            //cb = args[1];
            // cb();
            //assert(client.enqueueUploadJob.calledOnce);
            //assert(client.enqueueUploadJob.calledWith(item));
        });
    });
});
