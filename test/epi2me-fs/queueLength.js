import assert from 'assert';
import sinon from 'sinon';
import AWS from 'aws-sdk';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.queueLength', () => {
  let client;

  const queueUrl = 'queueUrl';

  beforeEach(() => {
    client = new EPI2ME({
      log: {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        json: sinon.stub(),
      },
    });
  });

  it('should return sqs queue', async () => {
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').resolves(sqs);
    sinon.stub(sqs, 'getQueueAttributes').callsFake((opts) => {
      assert.equal(opts.QueueUrl, queueUrl);
      return {
        promise: () =>
          Promise.resolve({
            Attributes: {
              ApproximateNumberOfMessages: 10,
            },
          }),
      };
    });

    try {
      const len = await client.queueLength(queueUrl);
      assert.equal(len, 10, 'expected length');
    } catch (err) {
      assert.fail(err);
    }
  });

  it('should handle poor response', async () => {
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').resolves(sqs);
    sinon.stub(sqs, 'getQueueAttributes').callsFake((opts) => {
      assert.equal(opts.QueueUrl, queueUrl);
      return {
        promise: () => Promise.resolve(),
      };
    });

    try {
      await client.queueLength(queueUrl);
    } catch (err) {
      assert(String(err).match(/unexpected response/));
    }
  });

  it('should handle sessionedSQS errors', async () => {
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').resolves(sqs);
    sinon.stub(sqs, 'getQueueAttributes').callsFake((opts) => {
      assert.equal(opts.QueueUrl, queueUrl);
      return {
        promise: () => Promise.reject(new Error('getQueueAttributes failure')),
      };
    });

    try {
      await client.queueLength(queueUrl);
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/getQueueAttributes failure/), 'error propagated');
    }
  });

  it('should reject if no queueURL given', async () => {
    try {
      await client.queueLength();
    } catch (e) {
      assert(String(e).match(/no queueURL specified/));
    }
  });
});
