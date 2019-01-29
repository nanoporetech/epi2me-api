import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';
import * as utils from '../../src/utils';

describe('rest.list', () => {
  let ringbuf, log, stubs, rest;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    stubs = [];
    rest = new REST({ log });
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke get with options', async () => {
    let stub = sinon.stub(utils, 'get').resolves({ things: [{ id_thing: 1, name: 'thing one' }] });
    stubs.push(stub);

    try {
      let list = await rest.list('thing');
      assert.deepEqual(list, [{ id_thing: 1, name: 'thing one' }]);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(stub.lastCall.args, ['thing', { log }]);
  });

  it('must catch request failure with structured error', async () => {
    const fake = sinon.fake();
    const stub = sinon.stub(utils, 'get').rejects(new Error('get failure'));
    stubs.push(stub);

    try {
      await rest.list('thing', fake);
    } catch (err) {
      assert(String(err).match(/get failure/), 'expected error');
    }
  });
});
