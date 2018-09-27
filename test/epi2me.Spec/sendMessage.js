import EPI2ME from "../../lib/epi2me";

const assert = require("assert");
const sinon  = require("sinon");
const bunyan = require("bunyan");
const queue  = require("queue-async");
const fs     = require("fs-extra");

describe('epi2me-api', () => {

    describe('sendMessage', () => {

	let ringbuf, log, client, stubs = [];;

	beforeEach((done) => {
	    ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	    client  = new EPI2ME({log: log, inputFolder: 'path'});

	    stubs.push(sinon.stub(fs, "rename").callsFake(() => {}));
	    stubs.push(sinon.stub(fs, "mkdirp").callsFake(() => {}));

	    sinon.stub(client.REST, "workflow_instance").callsFake((id, cb) => {
                cb(error, instance);
            });

            sinon.stub(client, "autoConfigure").callsFake((id, cb) => {
                cb();
            });

            sinon.stub(log, "warn");
            sinon.stub(log, "info");
	    done();
        });

	afterEach((done) => {
	    stubs.forEach((s) => { s.restore(); });
	    done();
	});

        it('sqs callback should handle error and log warning', (done) => {
            var item     = 'filename.fast5',
                objectId = 'PREFIX/'+item,
                sqsMock  = {
                    sendMessage: (err, cb) => {
                        cb("Error message");
                        assert(client.log.warn.calledOnce);
                    }
                };

	    assert.doesNotThrow(() => {
		client.sendMessage(sqsMock, objectId, item, () => {});
	    });
	    done();
        });

        it('sqs callback should move file to the ./uploaded folder', (done) => {
            var item     = 'filename.fast5',
                objectId = 'PREFIX/'+item,
                sqsMock  = {
                    sendMessage: () => {}
                };

	    assert.doesNotThrow(() => {
		client.sendMessage(sqsMock, objectId, item, () => {});
	    });

            //cb = args[1];
            // cb();
            //assert(client.enqueueUploadJob.calledOnce);
            //assert(client.enqueueUploadJob.calledWith(item));
	    done();
        });
    });
});
