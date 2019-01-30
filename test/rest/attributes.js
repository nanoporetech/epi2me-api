import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';

describe('rest.attributes', () => {
  it('must invoke list', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(REST.prototype, 'list').callsFake((uri, cb) => {
      assert.equal(uri, 'attribute', 'default uri');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.attributes(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
