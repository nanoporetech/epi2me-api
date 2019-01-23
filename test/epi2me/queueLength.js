import assert from "assert";
import sinon  from "sinon";
import bunyan from "bunyan";
import AWS    from "aws-sdk";
import EPI2ME from "../../lib/epi2me";

describe('epi2me.queueLength', () => {
    let client, queueUrl = 'queueUrl';

    beforeEach(() => {
        client = new EPI2ME({
	    log: {
		warn:  sinon.stub(),
		error: sinon.stub(),
		debug: sinon.stub(),
		info:  sinon.stub(),
	    }
	});
    });

    it('should return sqs queue', async () => {
	let sqs = new AWS.SQS();
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "getQueueAttributes").callsFake((opts) => {
	    assert.equal(opts.QueueUrl, queueUrl);
	    return {
		promise: () => { return Promise.resolve({ Attributes: { ApproximateNumberOfMessages: 10 } }); }
	    }
	});

        try {
	    let len = await client.queueLength(queueUrl);
	    assert.equal(len, 10, "expected length");
	} catch (e) {
	    assert.fail(e);
	}
    });

    it('should handle sessionedSQS errors', async () => {
	let sqs = new AWS.SQS();
	sinon.stub(client, "sessionedSQS").callsFake(() => { return sqs; });
	sinon.stub(sqs, "getQueueAttributes").callsFake((opts) => {
	    assert.equal(opts.QueueUrl, queueUrl);
	    return {
		promise: () => { return Promise.reject(new Error("getQueueAttributes failure")); }
	    }
	});

	let err;
        try {
	    await client.queueLength(queueUrl);
	} catch (e) {
	    err = e;
	}

	assert(String(err).match(/getQueueAttributes failure/), "error propagated");
    });
});
