import EPI2ME from "../../lib/epi2me";

const assert = require("assert");
const sinon  = require("sinon");
const bunyan = require("bunyan");
const queue  = require ('queue-async');

describe('epi2me-api', () => {

    describe('loadAvailableDownloadMessages', () => {

        let client, ringbuf, log, stub,
            parallelism = 10,
            queueLength = 50,
            messages;

        beforeEach((done) => {
            ringbuf  = new bunyan.RingBuffer({ limit: 100 });
	    log      = bunyan.createLogger({ name: "log", stream: ringbuf });
            client   = new EPI2ME({log: log});
            messages = Array
		.apply(null, Array(queueLength))
		.map(Number.prototype.valueOf, 0);

            sinon.stub(client, "queueLength").callsFake((url, cb) => {
                cb(messages.length);
            });
            sinon.stub(client, "sessionedSQS").callsFake((cb) => {
                return {
                    receiveMessage: (opts, cb) => {
                        cb(null, {
                            Messages: messages.splice(0, parallelism) // fetch 10 messages each time
                        });
                    }
                };
            });
            client.downloadWorkerPool = queue(parallelism);

	    sinon.stub(client, "processMessage").callsFake((msg, queueCb) => {
                setTimeout(queueCb);
            });
	    done();
        });

	afterEach((done) => {
	    stub.restore();
	    done();
	});

        it('should process all messages', (done) => {
	    stub = sinon.stub(client, "discoverQueue").callsFake((qs, queueName, successCb, failureCb) => {
                successCb("queueUrl");
            });
            client.downloadWorkerPool
                .await(() => {
                    client.loadAvailableDownloadMessages();
                    if (client.downloadWorkerPool.remaining() === 0) {
                        assert.equal(messages.length, 0);
                        assert.equal(client.processMessage.callCount, queueLength);
                        done();
                    }
                });
        });

        it('should handle discoverQueue errors', (done) => {
            sinon.stub(client, "discoverQueue").callsFake((qs, queueName, successCb, failureCb) => {
                failureCb("ErrorType");
            });

            client.downloadWorkerPool.await(() => {
                client.loadAvailableDownloadMessages();
                if (client.downloadWorkerPool.remaining() === 0) {
		    done();
		}
            });
        });
    });
});
