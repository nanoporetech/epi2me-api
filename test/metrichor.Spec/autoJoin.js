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
    'fs-extra' : fsProxy,
    'mkdirp'      : mkdirpProxy
});

describe('.autoJoin method', () => {

    function newApi(error, instance) {

        var client = new EPI2ME();

        client.workflow_instance = function (id, cb) {
            cb(error, instance);
        };

        client.autoConfigure = function (id, cb) {
            cb();
        };

        sinon.stub(client.log, "warn");
        sinon.spy(client, "autoConfigure");
        sinon.spy(client,  "workflow_instance");
        return client;
    }

    it('should join an existing workflow instance', () => {
        var client = newApi(null, {
            id_workflow_instance: 10,
            id_user: "user",
            outputqueue: "queue"
        });

        client.autoJoin(111, () => {
            assert(client.workflow_instance.calledOnce);
            assert(client.autoConfigure.calledOnce);

            var args = client.autoConfigure.args[0][0];
            assert.equal(args.id_workflow_instance, 10);
            assert.equal(args.id_user, 'user');
            assert.equal(args.outputqueue, 'queue');
        });
    });

    it('should handle workflow_instance errors', () => {
        var client = newApi(
            {
                error: "Message"
            },
            {
                state: "stopped"
            });

        client.autoJoin(111, () => {
            assert(client.workflow_instance.calledOnce);
            assert(client.log.warn.calledOnce);
            assert(client.log.warn.calledWith("Failed to join workflow instance: Message"));
            assert(client.autoConfigure.notCalled);
        });
    });

    it('should not join an instance where state === stopped', () => {
        var client = newApi(
            {
                state: "stopped"
            }
        );

        client.autoJoin(111, () => {
            assert(client.workflow_instance.calledOnce);
            assert(client.autoConfigure.notCalled);
            //assert(client.log.warn.calledWith("workflow 111 is already stopped"));
        });
    });
});
