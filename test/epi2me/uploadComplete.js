const assert = require("assert");
const sinon  = require("sinon");

import EPI2ME from "../../lib/epi2me";

describe('epi2me.uploadComplete', () => {
    var client;

    beforeEach(() => {
        client = new EPI2ME();
        sinon.stub(client, "sessionedSQS");
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
        sinon.stub(client, "sendMessage");
    });

    it('should handle error', (done) => {
        let discoverQueue = sinon.stub(client, "discoverQueue").rejects(new Error("failed"));
	assert.doesNotThrow(() => {
            client.uploadComplete(null, 'item', () => {
		sinon.assert.calledOnce(discoverQueue);
		done();
	    });
	}, () => {});
    });
});
