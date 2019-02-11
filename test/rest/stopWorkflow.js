import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.stopWorkflow', () => {
  it('must invoke put with details', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, 'put').callsFake((uri, id, payload, options, cb) => {
      assert.equal(uri, 'workflow_instance/stop', 'type passed');
      assert.equal(id, 123456, 'id passed');
      assert.equal(payload, null, 'payload passed');
      assert.ok(options.log instanceof bunyan, 'options off');
      cb();
    });
    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.stopWorkflow('123456', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
