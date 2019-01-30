import REST from '../../src/rest';
import utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.workflow_config', () => {
  it('must invoke get with options', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, 'get').callsFake((uri, options, cb) => {
      assert.deepEqual(options, { log }, 'options passed');
      assert.equal(uri, 'workflow/config/1234', 'url passed');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.workflow_config('1234', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
