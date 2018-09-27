import EPI2ME from "../../lib/epi2me";

const assert = require("assert");
const sinon  = require("sinon");
const bunyan = require("bunyan");

describe('epi2me-api', () => {

    describe('processMessage', () => {
        it('should handle bad message json', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
            let client  = new EPI2ME({log: log, downloadMode: "telemetry"});
            let stub    = sinon.stub(client, "deleteMessage");
            let msg     = { Body: '{message: body}' };

	    sinon.spy(log, "error");
	    assert.doesNotThrow(() => {
		client.processMessage(msg, () => {});
	    });

            sinon.assert.calledWith(stub, msg);
            assert(log.error.calledOnce);
	    stub.restore();
	    done();
        });

        it('should parse message json', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
            let client  = new EPI2ME({log: log, downloadMode: "telemetry"});

	    sinon.spy(log, "warn");
            let stub = sinon.stub(client,"sessionedS3").callsFake((cb) => {
                cb('error message');
            });

	    assert.doesNotThrow(() => {
		client.processMessage({
                    Body: '{"message": "body"}'
		}, () => {});
	    });
            assert(log.warn.calledOnce); // No path
	    done();
        });
    });
});
