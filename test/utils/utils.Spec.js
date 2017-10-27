var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var tmp            = require('tmp');
var fs             = require('fs');
var _              = require('lodash');
var path           = require('path');

describe('._responseHandler method', function () {
    var utils, container;

    beforeEach(function () {
        utils = proxyquire('../../lib/utils', {
            'request' : {}
        });
        container = {
            callback: function () {}
        };
        sinon.stub(container, 'callback');
    });

    it('should handle error status codes', function () {
        utils._responsehandler(null, {statusCode: 400}, '', container.callback);
        assert(container.callback.calledWith({"error": "Network error 400"}));
        assert(container.callback.calledOnce);
    });

    it('should handle errors', function () {
        assert.throws(function () {
            utils._responsehandler('message', '', ''); // ensure it checks callback exists
        });
        utils._responsehandler('message', '', '', container.callback);
        assert(container.callback.calledWith('message'));
        assert(container.callback.calledOnce);
    });

    it('should parse body and handle bad json', function () {
        assert.throws(function () {
                utils._responsehandler(null, '', '{\"error\": \"message\"}');
        });
        utils._responsehandler(null, '', '{\"error\": \"message\"}', container.callback);
        assert(container.callback.calledWith({error: 'message'}));
        assert(container.callback.calledOnce);
        utils._responsehandler(null, '', '{error: message}', container.callback); // Handles JSON error gracefully
        assert(container.callback.calledTwice);
    });

    describe('.findSuitableBatchIn method', function () {

        it('should create a batch in the folder', function (done) {
            tmp.dir({ unsafeCleanup: true }, function _tempDirCreated(err, tmpPath, cleanupCallback) {
                if (err) throw err;
                let batchFolder = utils.findSuitableBatchIn(tmpPath);
                fs.readdir(tmpPath, (e, ls) => {
                    assert(e === null, 'readdir does not throw an error');
                    assert(_.every(ls, folderName => folderName.match(/^batch_/)), 'all batches should be named: batch_xx');
                    done();
                    cleanupCallback();
                });
            });
        });

        it('should create dir if non-existent folder', function (done) {
            tmp.dir({ unsafeCleanup: true }, function _tempDirCreated(err, tmpPath, cleanupCallback) {
                if (err)  throw err
                let dir = utils.findSuitableBatchIn(path.join(tmpPath, 'test'));
                assert(dir.match(/batch_/), dir + ' should be named: batch_xx');
                done();
                cleanupCallback();
            });
        });
    });
});

