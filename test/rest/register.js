import REST from '../../src/rest';
import utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.register', () => {
  it('must invoke post with details', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, '_put').callsFake((type, code, payload, options, cb) => {
      assert.equal(type, 'reg', 'type passed');
      assert.equal(code, 'abcdefg', 'code passed');
      assert.ok(payload.description.match(/^\S+@\S+$/), 'payload description');
      assert.equal(options._signing, false, 'signing off');
      cb();
    });
    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.register('abcdefg', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
