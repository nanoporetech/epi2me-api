import assert from 'assert';
import sinon from 'sinon';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import EPI2ME from '../../src/epi2me';

describe('session fetchInstanceToken method', () => {
  let client;
  beforeEach(() => {
    client = new EPI2ME({
      log: {
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
      },
    });
  });

  it('should call if sts_expiration unset and initialise sessionQueue', async () => {
    const stub = sinon.stub(client, 'fetchInstanceToken').resolves();

    await client.session();
    assert(stub.calledOnce);
  });

  it('should call if sts_expiration unset', async () => {
    const stub = sinon.stub(client, 'fetchInstanceToken').resolves();
    client.sessionQueue = Promise.resolve();
    client.sessionQueue.busy = false;
    await client.session();
    assert(stub.calledOnce);
  });

  it('should call if sts_expiration expired', async () => {
    const stub = sinon.stub(client, 'fetchInstanceToken').resolves();
    client._stats.sts_expiration = 1;
    await client.session();
    assert(stub.calledOnce);
  });

  it('should not call if sts_expiration in the future', async () => {
    const stub = sinon.stub(client, 'fetchInstanceToken').resolves();
    client._stats.sts_expiration = 1000 + Date.now();
    await client.session();
    assert(stub.notCalled);
  });

  it('should resolve ok if sts_expiration in the future', async () => {
    const stub = sinon.stub(client, 'fetchInstanceToken').resolves();

    client._stats.sts_expiration = 1000 + Date.now();

    try {
      await client.session();
    } catch (e) {
      assert.fail(e);
    }

    assert(stub.notCalled);
  });

  it('should fire callback if sts_expiration expired', async () => {
    const stub = sinon.stub(client, 'fetchInstanceToken').resolves();

    client._stats.sts_expiration = 1;

    try {
      await client.session();
    } catch (e) {
      assert.fail(e);
    }
    assert(stub.calledOnce, 'fetchInstanceToken called');
  });

  it('should resolve ok if sts_expiration expired, passing error', async () => {
    const stub = sinon.stub(client, 'fetchInstanceToken').rejects(new Error('fetchInstanceToken failed'));

    client._stats.sts_expiration = 1;

    let err;
    try {
      await client.session();
    } catch (e) {
      err = e;
    }
    assert(stub.calledOnce, 'fetchInstanceToken called');
    assert.ok(String(err).match(/Error: fetchInstanceToken failed/));
  });
});
