import assert    from "assert";
import sinon     from "sinon";
import bunyan    from "bunyan";
import fs        from "fs-extra";
import { merge } from "lodash";
import AWS       from "aws-sdk";
import EPI2ME    from "../../lib/epi2me";

describe('epi2me.uploadComplete', () => {

    const clientFactory = (opts) => {
	return new EPI2ME(merge({
	    url: "https://epi2me-test.local",
	    log: {
		debug: sinon.stub(),
		info:  sinon.stub(),
		warn:  sinon.stub(),
		error: sinon.stub(),
	    }
	}, opts));
    };

    it('sqs callback failure should handle error and log warning', async () => {
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs,    "sendMessage").callsFake(() => {
	    return {
		promise: () => { return Promise.reject(new Error("uploadComplete failed")); }
	    }
	});

	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	    assert.fail("unexpected success");
	} catch (e) {
	    assert.ok(String(e).match(/SQS sendmessage exception/));
	}
    });

    it('sqs callback exception should handle error and log error', async () => {
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs,    "sendMessage").callsFake(() => {
	    return {
		promise: () => { return Promise.reject(new Error("uploadComplete failed")); }
	    }
	});

	let err;
	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	} catch (e) {
	    err = e;
	}
	assert(client.log.error.args[0][0].match(/uploadComplete failed/), "exception message logged");
	assert(String(err).match(/SQS sendmessage exception/), "error message passed back");
    });

    it('sqs callback success should move file and log info', async () => {
	let client = clientFactory();
	let sqs    = new AWS.SQS();
	let clock  = sinon.useFakeTimers();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj) => {
	    assert.deepEqual(JSON.parse(obj.MessageBody),
			     {"bucket":null,
			      "outputQueue":null,
			      "remote_addr":null,
			      "user_defined":null,
			      "utc":"1970-01-01T00:00:00.000Z",
			      "path":"object-id",
			      "prefix":"",
			     },
			     "uploadComplete payload");
	    return {
		promise: () => { return Promise.resolve(); }
	    }
	});

	let moveFile = sinon.stub(client, "_moveFile").callsFake((file, type) => {
	    assert.deepEqual(file, {id: "my-file"}, "object metadata");
	    return Promise.resolve();
	});

	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	} catch (e) {
	    assert.fail(e);
	}

	assert(client.log.info.lastCall.args[0].match(/my-file SQS message sent/), "info message logged");
	clock.restore();
    });

    it('should handle chain info with exception', async () => {
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").resolves();

	let moveFile = sinon.stub(client, "_moveFile").resolves();

	client.config.instance.chain = {}; // components undefined

	let err;
	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	} catch (e) {
	    err = e;
	}

	assert(client.log.error.args[0][0].match(/exception parsing/), "exception message logged");
	assert(String(err).match(/json exception/), "error message passed back");
    });

    it('should handle & propagate additional metadata', async () => {
	let clock  = sinon.useFakeTimers();
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj) => {
	    assert.deepEqual(JSON.parse(obj.MessageBody),
			     {"bucket":null,
			      "outputQueue":null,
			      "remote_addr":null,
			      "user_defined":null,
			      "utc":"1970-01-01T00:00:00.000Z",
			      "path":"object-id",
			      "prefix":"",
			      "targetComponentId": 1,  // this
			      "components": [],        // this
			      "key_id": "data-secret", // this
			      "agent_address": {       // this
				  "city": "Cambridge",
				  "ip": "127.0.0.1",
			      }
			     },
			     "uploadComplete payload");
	    return {
		promise: () => { return Promise.resolve(); }
	    }
	});

	let moveFile = sinon.stub(client, "_moveFile").resolves();

	client.config.instance.chain  = { components: [], targetComponentId: 1 };
	client.config.instance.key_id = "data-secret";
	client.config.options.agent_address = JSON.stringify({ "city": "Cambridge", "ip": "127.0.0.1" });

	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	} catch (e) {
	    assert.fail(e);
	}

	assert(client.log.info.lastCall.args[0].match(/my-file SQS message sent/), "info message logged");
	clock.restore();
    });

    it('should handle bad agent_address', async () => {
	let clock  = sinon.useFakeTimers();
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj) => {
	    assert.deepEqual(JSON.parse(obj.MessageBody),
			     {"bucket":null,
			      "outputQueue":null,
			      "remote_addr":null,
			      "user_defined":null,
			      "utc":"1970-01-01T00:00:00.000Z",
			      "path":"object-id",
			      "prefix":"",
			      "targetComponentId": 1,  // this
			      "components": [],        // this
			      "key_id": "data-secret", // this
			     },
			     "uploadComplete payload");
	    return {
		promise: () => { return Promise.resolve(); }
	    }
	});

	let moveFile = sinon.stub(client, "_moveFile").resolves();

	client.config.instance.chain  = { components: [], targetComponentId: 1 };
	client.config.instance.key_id = "data-secret";
	client.config.options.agent_address = "bad json data";

	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	} catch (e) {
	    assert.fail(e);
	}

	assert(client.log.error.args[0][0].match(/Could not parse agent_address/), "error message logged");
	clock.restore();
    });

    it('should inject upload & download message queues. is this used?', async () => {
	let clock  = sinon.useFakeTimers();
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj) => {
	    assert.deepEqual(JSON.parse(obj.MessageBody).components,
			     [
				 {id: 1, inputQueueName: "upload-q"},
				 {id: 2, inputQueueName: "download-q"},
			     ],
			     "uploadComplete replaced component queue names");
	    return {
		promise: () => { return Promise.resolve(); }
	    }
	});
	let moveFile = sinon.stub(client, "_moveFile").resolves();

	client.uploadMessageQueue = "upload-q";
	client.downloadMessageQueue = "download-q";
	client.config.instance.chain = {
	    components: [
		{id: 1, inputQueueName: "uploadMessageQueue"},
		{id: 2, inputQueueName: "downloadMessageQueue"}
	    ]
	};

	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	} catch (e) {
	    assert.fail(e);
	}
	assert(client.log.info.lastCall.args[0].match(/my-file SQS message sent/), "info message logged");
	clock.restore();
    });
});
