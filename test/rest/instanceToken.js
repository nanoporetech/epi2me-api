import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.instanceToken', () => {
  let log;
  let rest;

  beforeEach(() => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    rest = new REST({
      log,
      agent_version: '3.0.0',
    });
  });

  it('must invoke post with options', async () => {
    const stub = sinon.stub(utils, 'post').resolves({ data: 'some data' });
    const fake = sinon.fake();

    try {
      await rest.instanceToken('12345', fake);

      assert.deepEqual(
        stub.args[0],
        [
          'token',
          { id_workflow_instance: '12345' },
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
      assert.deepEqual(fake.lastCall.args, [null, { data: 'some data' }], 'callback args');
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }

    assert.deepEqual(
      stub.args[0],
      [
        'token',
        { id_workflow_instance: '12345' },
        {
          legacy_form: true,
          agent_version: '3.0.0',
          local: false,
          url: 'https://epi2me.nanoporetech.com',
          user_agent: 'EPI2ME API',
          signing: true,
          log,
        },
      ],
      'post args',
    );
    assert.deepEqual(fake.lastCall.args, [null, { data: 'some data' }], 'callback args');
    stub.restore();
  });

  it('must handle error', async () => {
    const stub = sinon.stub(utils, 'post').rejects(new Error('token fail'));
    const fake = sinon.fake();

    try {
      await rest.instanceToken('12345', fake);
      assert(String(fake.lastCall.args[0]).match(/token fail/), 'expected error');
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }
  });
});
