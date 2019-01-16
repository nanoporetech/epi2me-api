import utils from "../../lib/utils";

const assert = require("assert");
const sinon  = require("sinon");
const tmp    = require('tmp');
const fs     = require('fs-extra');
const _      = require('lodash');
const path   = require('path');

describe('._responseHandler method', () => {
    let callback;

    beforeEach(() => {
	callback = sinon.fake();
    });

    it('should handle error status codes', () => {
        utils._responsehandler(null, {statusCode: 400}, '', callback);
        assert(callback.calledOnce);
        assert(callback.calledWith({"error": "Network error 400"}));
    });

    it('should handle errors', () => {
        assert.throws(() => {
            utils._responsehandler('message', '', ''); // ensure it checks callback exists
        });
        utils._responsehandler('message', '', '', callback);
        assert(callback.calledOnce);
        assert(callback.calledWith('message'));
    });

    it('should parse body and handle bad json', () => {
        assert.throws(() => {
                utils._responsehandler(null, '', '{\"error\": \"message\"}');
        });
        utils._responsehandler(null, '', '{\"error\": \"message\"}', callback);
        assert(callback.calledWith({error: 'message'}));
        assert(callback.calledOnce);
        utils._responsehandler(null, '', '{error: message}', callback); // Handles JSON error gracefully
        assert(callback.calledTwice);
    });

    describe('.findSuitableBatchIn method', () => {

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

