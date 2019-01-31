import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import os from 'os';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.register', () => {
  let ringbuf, log, stubs, rest;
  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    rest = new REST({ log, agent_version: '3.0.0' });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke post with details', async () => {
    const stub = sinon.stub(utils, 'put').resolves({});
    stubs.push(stub);
    stubs.push(
      sinon.stub(os, 'userInfo').callsFake(() => {
        return { username: 'testuser' };
      }),
    );
    stubs.push(
      sinon.stub(os, 'hostname').callsFake(() => {
        return 'testhost';
      }),
    );
    const fake = sinon.fake();

    try {
      await rest.register('abcdefg', fake);
      //    assert(fake.calledOnce, 'callback invoked');
      assert.deepEqual(
        stub.lastCall.args,
        [
          'reg',
          'abcdefg',
          { description: 'testuser@testhost' },
          {
            log,
            signing: false,
            legacy_form: true,
            agent_version: '3.0.0',
            local: false,
            url: 'https://epi2me.nanoporetech.com',
            user_agent: 'EPI2ME API',
          },
        ],
        'put args',
      );
    } catch (e) {
      assert.fail(e);
    }
  });
});
