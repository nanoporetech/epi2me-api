import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.discoverQueue', () => {
  const clientFactory = (opts) =>
    new EPI2ME(
      merge(
        {
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            json: sinon.stub(),
          },
        },
        opts,
      ),
    );

  it('discovers successfully', async () => {
    const client = clientFactory();
    sinon.stub(client, 'sessionedSQS').callsFake(() => ({
      getQueueUrl: () => ({
        promise: () =>
          Promise.resolve({
            QueueUrl: 'https://my.cloud/queues/my_queue',
          }),
      }),
    }));

    let data;
    try {
      data = await client.discoverQueue('my_queue');
    } catch (error) {
      assert.fail(error);
    }

    assert.equal(data, 'https://my.cloud/queues/my_queue', 'success callback fired with queue url');
  });

  it('discovers with cache hit', async () => {
    const client = clientFactory();
    client.config.instance.discoverQueueCache.my_queue = 'https://my.cloud/queues/my_queue';

    sinon.stub(client, 'sessionedSQS').callsFake(() => ({
      getQueueUrl: () => ({
        promise: () =>
          Promise.resolve({
            QueueUrl: 'https://my.cloud/queues/my_queue',
          }),
      }),
    }));

    let data;
    try {
      data = await client.discoverQueue('my_queue');
    } catch (error) {
      assert.fail(error);
    }

    assert.equal(data, 'https://my.cloud/queues/my_queue', 'success callback fired with queue url');
    sinon.assert.notCalled(client.sessionedSQS); // no need to run a real query
  });

  it('fails to discover', async () => {
    const client = clientFactory();

    sinon.stub(client, 'sessionedSQS').callsFake(() => ({
      getQueueUrl: () => ({
        promise: () => Promise.reject(new Error('no such queue')),
      }),
    }));

    try {
      await client.discoverQueue('my_queue');
      assert.fail('unexpected success');
    } catch (error) {
      assert.ok(String(error).match(/no such queue/), 'failure callback fired with message');
    }
  });
});
