import assert    from "assert";
import sinon     from "sinon";
import bunyan    from "bunyan";
import { merge } from "lodash";
import EPI2ME    from "../../lib/epi2me";

describe('epi2me.loadAvailableDownloadMessages', () => {

    let debug;
    const clientFactory = (opts) => {
	return new EPI2ME(merge({
	    url: "https://epi2me-test.local",
	    log: {
		debug: debug,
		info:  sinon.stub(),
		warn:  sinon.stub(),
		error: sinon.stub(),
	    }
	}, opts));
    };

    beforeEach(() => {
	debug = sinon.stub();
    });

    it('should process undefined messages', async () => {
	let client = clientFactory();
	sinon.stub(client, "discoverQueue").resolves("http://queue.url/");
	sinon.stub(client, "queueLength").resolves(); // undefined
	sinon.stub(client, "downloadAvailable").callsFake();

	try {
	    await client.loadAvailableDownloadMessages();
	} catch (e) {
	    assert.fail(e);
	}

	assert(debug.lastCall.args[0].match(/no downloads available/));
	assert(client.downloadAvailable.notCalled);
    });

    it('should process null messages', async () => {
	let client = clientFactory();
	sinon.stub(client, "discoverQueue").resolves("http://queue.url/");
	sinon.stub(client, "queueLength").resolves(null); // null
	sinon.stub(client, "downloadAvailable").callsFake();

	try {
	    await client.loadAvailableDownloadMessages();
	} catch (e) {
	    assert.fail(e);
	}

	assert(debug.lastCall.args[0].match(/no downloads available/));
	assert(client.downloadAvailable.notCalled);
    });

    it('should process zero messages', async () => {
	let client = clientFactory();
	sinon.stub(client, "discoverQueue").resolves("http://queue.url/");
	sinon.stub(client, "queueLength").resolves(0); // zero
	sinon.stub(client, "downloadAvailable").callsFake();

	try {
	    await client.loadAvailableDownloadMessages();
	} catch (e) {
	    assert.fail(e);
	}

	assert(debug.lastCall.args[0].match(/no downloads available/));
	assert(client.downloadAvailable.notCalled);
    });

    it('should process n messages', async () => {
	let client = clientFactory();
	sinon.stub(client, "discoverQueue").resolves("http://queue.url/");
	sinon.stub(client, "queueLength").resolves(50); // n
	sinon.stub(client, "downloadAvailable").callsFake();

	try {
	    await client.loadAvailableDownloadMessages();
	} catch (e) {
	    assert.fail(e);
	}

	assert(debug.lastCall.args[0].match(/downloads available: 50/));
	assert(client.downloadAvailable.calledOnce);
    });
});
