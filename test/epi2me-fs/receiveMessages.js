import assert from 'assert';
import sinon from 'sinon';
import EPI2ME from '../../src/epi2me-fs';

describe('epi2me.receiveMessages', () => {
  let client;
  let clock;

  beforeEach(() => {
    client = new EPI2ME({
      log: {
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        json: sinon.stub(),
      },
    });
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

    assert.equal(client.log.info.lastCall.args, 'complete (empty)');
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
      client.receiveMessages({
        Messages: [
          {
            MessageId: 1,
          },
          {
            MessageId: 2,
          },
          {
            MessageId: 3,
          },
          {
            MessageId: 4,
          },
        ],
      }); // no awaiting here so we can resolve promises with a clock tick
    } catch (e) {
      assert.fail(e);
    }

    assert.equal(Object.keys(client.downloadWorkerPool).length, 4, 'pending message count');

    clock.tick(10);

    await Promise.all(Object.values(client.downloadWorkerPool));

    assert.equal(Object.keys(client.downloadWorkerPool).length, 0, 'processed message count');
    assert.equal(client.processMessage.callCount, 4, 'processMessage invocation count');
  });
});
