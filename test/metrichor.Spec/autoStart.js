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
var EPI2ME = proxyquire('../../lib/metrichor.js', {
    'aws-sdk'     : awsProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'      : mkdirpProxy
});

describe('.autoStart method', () => {

    function newApi(error, instance) {

        var client = new EPI2ME();
        client.start_workflow = function (id, cb) {
            cb(error, instance);
        };

        client.autoConfigure = function (id, cb) {
            cb();
        };

        sinon.stub(client.log, "warn");
        sinon.spy(client, "autoConfigure");
        sinon.spy(client,  "start_workflow");
        return client;
    }

    it('should initiate a new workflow instance', () => {
        var client = newApi(null, {
            id_workflow_instance: 10,
            id_user: "user",
            outputqueue: "queue"
        });

        client.autoStart(111, () => {
            assert(client.start_workflow.calledOnce);
            assert(client.autoConfigure.calledOnce);

            var args = client.autoConfigure.args[0][0];
            assert.equal(args.id_workflow_instance, 10);
            assert.equal(args.id_user, 'user');
            assert.equal(args.outputqueue, 'queue');
        });
    });

    it('should handle start_workflow errors', () => {
        var client = newApi(
            {
                error: "Message"
            },
            {
                state: "stopped"
            });

        client.autoStart(111, () => {
            assert(client.start_workflow.calledOnce);
            assert(client.log.warn.calledOnce);
            assert(client.log.warn.calledWith("Failed to start workflow: Message"));
            assert(client.autoConfigure.notCalled);
        });
    });
});
