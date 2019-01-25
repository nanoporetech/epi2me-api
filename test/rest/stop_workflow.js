import REST from '../../src/rest';
import * as utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.stop_workflow', () => {
  it('must invoke put with details', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, '_put').callsFake((uri, id, payload, options, cb) => {
      assert.equal(uri, 'workflow_instance/stop', 'type passed');
      assert.equal(id, 123456, 'id passed');
      assert.equal(payload, null, 'payload passed');
      assert.ok(options.log instanceof bunyan, 'options off');
      cb();
    });
    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.stop_workflow('123456', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
