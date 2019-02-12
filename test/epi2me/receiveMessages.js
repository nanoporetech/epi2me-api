import assert from 'assert';
import sinon from 'sinon';
import bunyan from 'bunyan';
import EPI2ME from '../../src/epi2me';

describe('epi2me.receiveMessages', () => {
  let ringbuf;
  let log;
  let client;
  let clock;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    client = new EPI2ME({ log });
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should ignore empty message', async () => {
    try {
      await client.receiveMessages({});
    } catch (e) {
      assert.fail(e);
    }
    assert.equal(JSON.parse(ringbuf.records[0]).msg, 'complete (empty)');
  });

  it('should queue and process download messages using downloadWorkerPool', async () => {
    sinon.stub(client, 'processMessage').callsFake(() => {
      const p = new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, 1);
      });
      return p;
    });

    try {
      client.receiveMessages({ Messages: [1, 2, 3, 4] }); // no awaiting here so we can resolve promises with a clock tick
    } catch (e) {
      assert.fail(e);
    }
    assert.equal(client.downloadWorkerPool.remaining, 4, 'pending message count');

    clock.tick(10);

    await Promise.all(client.downloadWorkerPool);

    assert.equal(client.downloadWorkerPool.remaining, 0, 'processed message count');
    assert.equal(client.processMessage.callCount, 4, 'processMessage invocation count');
  });
});
