import REST from '../../src/rest';
import utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.user', () => {
  it('must invoke get with options', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, 'get').callsFake((uri, options, cb) => {
      assert.deepEqual(options, { log }, 'options passed');
      assert.equal(uri, 'user', 'url passed');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.user(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must yield fake local user', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const logger = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, 'get').callsFake((uri, options, cb) => {
      const { log } = options;
      assert.equal(logger, log, 'options passed');
      assert.equal(uri, 'user', 'url passed');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log: logger, local: true });
    assert.doesNotThrow(() => {
      rest.user(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    sinon.assert.calledWith(fake, null, { accounts: [{ id_user_account: 'none', number: 'NONE', name: 'None' }] });
    stub.restore();
  });
});
