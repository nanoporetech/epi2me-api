import assert from "assert";
import sinon from "sinon";
import bunyan from "bunyan";
import EPI2ME from "../../lib/epi2me";

describe('epi2me.receiveMessages', () => {
    let ringbuf, log, client;

    beforeEach(() => {
	ringbuf = new bunyan.RingBuffer({ limit: 100 });
	log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	client  = new EPI2ME({log: log});

	sinon.spy(log, "warn");
        sinon.stub(client, "processMessage").callsFake((msg, queueCb) => {
            setTimeout(queueCb, 1);
        });
    });

    it('should ignore empty message', async () => {
        try {
	    await client.receiveMessages({});
	} catch (e) {
	    assert.fail(e);
	}
	assert.equal(JSON.parse(ringbuf.records[0]).msg, "complete (empty)");
    });

    it('should queue and process download messages using downloadWorkerPool', async () => {
	try {
	    await client.receiveMessages({ Messages: [1, 2, 3, 4] });
	} catch (e) {
	    assert.fail(e);
	}
        assert.equal(client.downloadWorkerPool.remaining(), 4);

	let p = new Promise((resolve, reject) => {
            client.downloadWorkerPool.await(resolve);
	});
	await p;
	assert.equal(client.downloadWorkerPool.remaining(), 0);
    });
});
