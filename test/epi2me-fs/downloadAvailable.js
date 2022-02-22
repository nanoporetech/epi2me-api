import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.downloadAvailable', () => {
  let debug;
  let warn;
  let info;
  let error;
  let critical;

  const clientFactory = (opts) => {
    const client = new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug,
        info,
        warn,
        error,
        critical,
      },
      ...opts,
    });
    client.config.instance.outputQueueName = "example output queue";
    return client;
  }

  beforeEach(() => {
    debug = sinon.stub();
    warn = sinon.stub();
    info = sinon.stub();
    error = sinon.stub();
    critical = sinon.stub();
  });

  it('should resolve if already busy', async () => {
    const client = clientFactory();
    client.downloadWorkerPool = {
      one: 1,
      two: 2,
      three: 3,
    };
    sinon.stub(client, 'receiveMessages').resolves();

    try {
      await client.downloadAvailable();
    } catch (e) {
      assert.fail(e);
    }

    assert(client.receiveMessages.notCalled);
  });

  it('should handle discoverQueue errors', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').rejects(new Error('discoverQueue failed'));
    sinon.stub(client, 'receiveMessages').resolves();

    let err;
    try {
      await client.downloadAvailable();
    } catch (e) {
      err = e;
    }
    assert(String(err).match(/discoverQueue failed/));
    assert(client.receiveMessages.notCalled);
  });

  it('should handle new receiveMessage error', async () => {
    const client = clientFactory();
    delete client.downloadWorkerPool; // force missing
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => ({
      receiveMessage: () => {
        return {
          promise: () => Promise.reject(new Error('timed out')),
        };
      },
    })); // undefined
    sinon.stub(client, 'receiveMessages').resolves();

    let err;
    try {
      await client.downloadAvailable();
    } catch (e) {
      err = e;
    }
    assert(String(err).match(/timed out/));
    assert(client.receiveMessages.notCalled);
  });

  it('should handle subsequent receiveMessage error', async () => {
    const client = clientFactory();
    client.states.download.failure = {
      'receiveMessage error\n\ttimed out': 1,
    };
    delete client.downloadWorkerPool; // force missing
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => ({
      receiveMessage: () => {
        return {
          promise: () => Promise.reject(new Error('timed out')),
        };
      },
    })); // undefined
    sinon.stub(client, 'receiveMessages').resolves();

    let err;
    try {
      await client.downloadAvailable();
    } catch (e) {
      err = e;
    }
    assert(String(err).match(/timed out/));
    assert(client.receiveMessages.notCalled);
    assert.deepEqual(client.states.download.failure, {
      'receiveMessage error\n\ttimed out': 2,
    });
  });

  it('should process message set', async () => {
    const client = clientFactory();
    delete client.downloadWorkerPool; // force missing
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => ({
      receiveMessage: () => {
        return {
          promise: () => Promise.resolve([{}, {}]),
        };
      },
    })); // undefined
    sinon.stub(client, 'receiveMessages').resolves();

    try {
      await client.downloadAvailable();
    } catch (e) {
      assert.fail(e);
    }

    assert(client.receiveMessages.calledOnce);
  });
});
