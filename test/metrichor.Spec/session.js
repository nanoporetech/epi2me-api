"use strict";
var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
var tmp            = require('tmp');
var queue          = require('queue-async');
var fs             = require('fs');
var requestProxy   = {};
var fsProxy        = {};
var mkdirpProxy    = {};
var awsProxy       = {};
var Metrichor      = proxyquire('../../lib/metrichor', {
    'aws-sdk'     : awsProxy,
    'request'     : requestProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'      : mkdirpProxy
});

describe('session fetchInstanceToken method', function () {

    var cb;

    function newApi(opts, tokenError, token) {
        cb = {};
        cb.queueCb = function () {};
        sinon.stub(cb, 'queueCb');
        var client = new Metrichor(opts);
        // _config.instance.id_workflow_instance, function (tokenError, token) {}
        client.token = function (id_workflow_instance, cb) {
            setTimeout(function () {
                cb(tokenError, token);
            }, 10);
        };
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");
        return client;
    }

    // Should clear queue and call success callback

    it('should not fetch token when still valid', function () {
        var cli = newApi({id_workflow_instance: 10}, null, "abc");
        cli._stats.sts_expiration = new Date(Date.now() + 100);
        sinon.spy(cli, "token");
        cli.session();
        assert(cli.token.notCalled);
    });

    it('should fetch token only once when expired', function () {
        var cli = newApi({id_workflow_instance: 10}, null, { expiration: Date.now() + 1000000 });
        cli._stats.sts_expiration = new Date(Date.now() - 100);
        sinon.spy(cli, "token");
        sinon.spy(cli, "fetchInstanceToken");

        cli.session();
        assert(cli.token.calledOnce, "first call - fetch token");

        for (var i=0; i<10; i++) {
            cli.session(); // following calls - don't fetch token
        }

        cli.session();
        assert(cli.token.calledOnce, "last call - don't fetch token");
        assert.equal(cli.sessionQueue.remaining(), 1, "last call - don't fetch token");
    });

    it('should handle that.token error', function (done) {
        // set instance_id without
        var cli = newApi({id_workflow_instance: 10, waitTokenError: 0.01}, "ERROR MESSAGE", null);
        cb.success = function (error_msg) {
            assert(cli.log.warn.calledOnce, 'log warning message');
            done();
        };
        cli.fetchInstanceToken(function (arg) {
            return cb.success(arg);
        });
    });

    it('should throw and error when id_workflow_instance is missing', function () {
        // set instance_id without
        var cli = newApi({}, null, "abc");
        assert.throws(function () {
            cli.fetchInstanceToken();
        }, 'throwing error');
    });
});
