import assert    from "assert";
import sinon     from "sinon";
import bunyan    from "bunyan";
import queue     from "queue-async";
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

	try {
	    await client.uploadComplete("object-id", {id: "my-file"});
	} catch (e) {
	    assert.fail(e);
	}
	assert(client.log.error.args[0][0].match(/uploadComplete failed/), "exception message logged");
	assert(callback.args[0][0].match(/SQS sendmessage exception/), "error message passed back");
    });

    it('sqs callback success should move file and log info', () => {
	let client = clientFactory();
	let sqs    = new AWS.SQS();
	let clock  = sinon.useFakeTimers();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj, cb) => {
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
	    cb();
	});
	let callback = sinon.stub();
	let moveUploadedFile = sinon.stub(client, "_moveUploadedFile").callsFake((file, cb) => {
	    assert.deepEqual(file, {id: "my-file"}, "object metadata");
	    cb();
	});
	assert.doesNotThrow(() => {
	    client.uploadComplete("object-id", {id: "my-file"}, callback);
	});
	assert(client.log.info.args[1][0].match(/my-file SQS message sent/), "info message logged");
	clock.restore();
    });

    it('should handle chain info with exception', () => {
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((err, cb) => {
	    cb();
	});
	let callback = sinon.stub();
	let moveUploadedFile = sinon.stub(client, "_moveUploadedFile").callsFake((file, cb) => {
	    cb();
	});
	client.config.instance.chain = {}; // components undefined
	assert.doesNotThrow(() => {
	    client.uploadComplete("object-id", {id: "my-file"}, callback);
	});
	assert(client.log.error.args[0][0].match(/exception parsing/), "exception message logged");
	assert(callback.args[0][0].match(/json exception/), "error message passed back");
    });

    it('should handle & propagate additional metadata', () => {
	let clock  = sinon.useFakeTimers();
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj, cb) => {
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
	    cb();
	});
	let callback = sinon.stub();
	let moveUploadedFile = sinon.stub(client, "_moveUploadedFile").callsFake((file, cb) => {
	    cb();
	});

	client.config.instance.chain  = { components: [], targetComponentId: 1 };
	client.config.instance.key_id = "data-secret";
	client.config.options.agent_address = JSON.stringify({ "city": "Cambridge", "ip": "127.0.0.1" });
	assert.doesNotThrow(() => {
	    client.uploadComplete("object-id", {id: "my-file"}, callback);
	});
	assert(client.log.info.args[1][0].match(/my-file SQS message sent/), "info message logged");
	clock.restore();
    });

    it('should handle bad agent_address', () => {
	let clock  = sinon.useFakeTimers();
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj, cb) => {
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
	    cb();
	});
	let callback = sinon.stub();
	let moveUploadedFile = sinon.stub(client, "_moveUploadedFile").callsFake((file, cb) => {
	    cb();
	});

	client.config.instance.chain  = { components: [], targetComponentId: 1 };
	client.config.instance.key_id = "data-secret";
	client.config.options.agent_address = "bad json data";
	assert.doesNotThrow(() => {
	    client.uploadComplete("object-id", {id: "my-file"}, callback);
	});
	assert(client.log.error.args[0][0].match(/Could not parse agent_address/), "error message logged");
	clock.restore();
    });

    it('should inject upload & download message queues. is this used?', () => {
	let clock  = sinon.useFakeTimers();
	let client = clientFactory();
	let sqs    = new AWS.SQS();

	sinon.stub(client, "discoverQueue").resolves("http://my-queue/");
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "sendMessage").callsFake((obj, cb) => {
	    assert.deepEqual(JSON.parse(obj.MessageBody).components,
			     [
				 {id: 1, inputQueueName: "upload-q"},
				 {id: 2, inputQueueName: "download-q"},
			     ],
			     "uploadComplete replaced component queue names");
	    cb();
	});
	let callback = sinon.stub();
	let moveUploadedFile = sinon.stub(client, "_moveUploadedFile").callsFake((file, cb) => {
	    cb();
	});

	client.uploadMessageQueue = "upload-q";
	client.downloadMessageQueue = "download-q";
	client.config.instance.chain = {
	    components: [
		{id: 1, inputQueueName: "uploadMessageQueue"},
		{id: 2, inputQueueName: "downloadMessageQueue"}
	    ]
	};

	assert.doesNotThrow(() => {
	    client.uploadComplete("object-id", {id: "my-file"}, callback);
	});
	assert(client.log.info.args[1][0].match(/my-file SQS message sent/), "info message logged");
	clock.restore();
    });
});
