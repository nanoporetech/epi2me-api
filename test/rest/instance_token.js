import REST from '../../src/rest';
import utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.instance_token', () => {
  it('must invoke post with options', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, '_post').callsFake((uri, obj, options, cb) => {
      assert.deepEqual(obj, { id_workflow_instance: '12345' }, 'obj passed');
      assert.deepEqual(options, { log, legacy_form: true }, 'options passed');
      assert.equal(uri, 'token', 'url passed');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.instance_token('12345', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
