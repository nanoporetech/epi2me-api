import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.read', () => {
  let ringbuf, log, stubs, rest;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    stubs = [];
    rest = new REST({ log, agent_version: '3.0.0' });
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke get with options', async () => {
    let stub = sinon.stub(utils, 'get').resolves({ id_thing: 5, name: 'thing five' });
    stubs.push(stub);

    try {
      let struct = await rest.read('thing', 5);
      assert.deepEqual(struct, { id_thing: 5, name: 'thing five' });
      assert.deepEqual(stub.lastCall.args, [
        'thing/5',
        { log, agent_version: '3.0.0', local: false, url: 'https://epi2me.nanoporetech.com', user_agent: 'EPI2ME API' },
      ]);
    } catch (e) {
      assert.fail(e);
    }
  });

  it('must catch request failure with structured error', async () => {
    const fake = sinon.fake();
    const stub = sinon.stub(utils, 'get').rejects(new Error('get failure'));
    stubs.push(stub);

    try {
      await rest.read('thing', 5, fake);
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/get failure/), 'expected error');
    }
  });
});
