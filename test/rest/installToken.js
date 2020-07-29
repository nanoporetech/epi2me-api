import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.installToken', () => {
  let log;
  let rest;

  beforeEach(() => {
    const ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    rest = new REST({
      log,
      agent_version: '3.0.0',
    });
  });

  it('must invoke post with options', async () => {
    const stub = sinon.stub(utils, 'post').resolves({
      data: 'some data',
    });

    let token;
    try {
      token = await rest.installToken('12345');
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }

    assert.deepEqual(
      stub.args[0],
      [
        'token/install',
        {
          id_workflow: '12345',
        },
        {
          legacy_form: true,
          agent_version: '3.0.0',
          local: false,
          signing: true,
          url: 'https://epi2me.nanoporetech.com',
          user_agent: 'EPI2ME API',
          log,
        },
      ],
      'post args',
    );
    assert.deepEqual(
      token, {
        data: 'some data',
      },
      'token content',
    );
  });

  it('must handle error', async () => {
    const stub = sinon.stub(utils, 'post').rejects(new Error('token fail'));

    let err;
    try {
      await rest.installToken('12345');
    } catch (e) {
      err = e;
    } finally {
      stub.restore();
    }
    assert(String(err).match(/token fail/), 'expected error');
  });
});
