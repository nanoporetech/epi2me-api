import EPI2ME from "../../lib/epi2me";

const assert = require("assert");
const sinon  = require("sinon");
const bunyan = require("bunyan");
const queue  = require("queue-async");

describe('epi2me-api', () => {

    describe('.receiveMessages', () => {
	let ringbuf, log, client;

	beforeEach(() => {
	    ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	    client  = new EPI2ME({log: log});

	    sinon.spy(log, "warn");
            sinon.stub(client, "processMessage").callsFake((msg, queueCb) => {
                setTimeout(queueCb, 1);
            });
            client.downloadWorkerPool = queue(10);
        });

        it('should handle error and log warning', (done) => {
            assert.doesNotThrow(() => {
		client.receiveMessages('Error Message');
	    });
            assert(log.warn.calledOnce);
	    done();
        });

        it('should ignore empty message', (done) => {
            assert.doesNotThrow(() => {
		client.receiveMessages(null, {});
	    });
	    assert.equal(JSON.parse(ringbuf.records[0]).msg, "complete (empty)");
	    done();
        });

        it('should queue and process download messages using downloadWorkerPool', (done) => {
	    assert.doesNotThrow(() => {
		client.receiveMessages(null, { Messages: [1, 2, 3, 4] }, () => {
                    assert.equal(client.downloadWorkerPool.remaining(), 4);
		});
	    });

            client.downloadWorkerPool.await(() => {
                assert.equal(client.downloadWorkerPool.remaining(), 0);
                done();
            });
        });
    });
});
