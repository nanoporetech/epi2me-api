const assert = require("assert");
const sinon  = require("sinon");

import EPI2ME from "../../lib/epi2me";

describe('epi2me.discoverQueue', () => {
    it('discovers successfully', () => {
        let client = new EPI2ME({});
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(null, {QueueUrl: "https://my.cloud/queues/my_queue"});
	    }),
	};

	let success = sinon.fake();
	let failure = sinon.fake();
	assert.doesNotThrow(() => {
	    client.discoverQueue(sqs, 'my_queue', success, failure);
	});
	sinon.assert.calledOnce(success);
	sinon.assert.notCalled(failure);
	assert.equal(success.args[0][0], "https://my.cloud/queues/my_queue", "success callback fired with queue url");
    });

    it('discovers with cache hit', () => {
        let client = new EPI2ME({});
	client.config.instance._discoverQueueCache["my_queue"] = "https://my.cloud/queues/my_queue";
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(null, {QueueUrl: "https://my.cloud/queues/my_queue"});
	    }),
	};

	let success = sinon.fake();
	let failure = sinon.fake();
	assert.doesNotThrow(() => {
	    client.discoverQueue(sqs, 'my_queue', success, failure);
	});
	sinon.assert.notCalled(sqs.getQueueUrl); // no need to run a real query
	sinon.assert.calledOnce(success);
	sinon.assert.notCalled(failure);
	assert.equal(success.args[0][0], "https://my.cloud/queues/my_queue", "success callback fired with queue url");
    });

    it('discovers badly', () => {
        let client = new EPI2ME({});
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(null, {xQueueUrl: "https://my.cloud/queues/my_queue"});
	    }),
	};

	let success = sinon.fake();
	let failure = sinon.fake();
	assert.doesNotThrow(() => {
	    client.discoverQueue(sqs, 'my_queue', success, failure);
	});
	sinon.assert.calledOnce(failure);
	sinon.assert.notCalled(success);
	assert.equal(failure.args[0][0], "getqueueurl error", "failure callback fired with message");
    });

    it('fails to discover', () => {
        let client = new EPI2ME({});
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(new Error("no such queue"));
	    }),
	};

	let success = sinon.fake();
	let failure = sinon.fake();
	assert.doesNotThrow(() => {
	    client.discoverQueue(sqs, 'my_queue', success, failure);
	});
	sinon.assert.calledOnce(failure);
	sinon.assert.notCalled(success);
	assert.equal(failure.args[0][0], "getqueueurl error", "failure callback fired with message");
    });

    it('fails to discover with proxy set', () => {
        let client = new EPI2ME({proxy:"https://my.proxy:3128/"});
        let warn = sinon.stub(client.log, "warn");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(new Error("Unexpected close tag"));
	    }),
	};

	let success = sinon.fake();
	let failure = sinon.fake();
	assert.doesNotThrow(() => {
	    client.discoverQueue(sqs, 'my_queue', success, failure);
	});
	sinon.assert.calledOnce(failure);
	sinon.assert.notCalled(success);
	assert.equal(failure.args[0][0], "getqueueurl error", "failure callback fired with message");
	assert.ok(warn.args[0][0].match(/proxy compatibility/), "check your proxy warning emitted");
    });
});
