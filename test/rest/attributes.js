import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';

describe('rest.attributes', () => {
  it('must invoke list', async () => {
    const ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    const log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    const stub = sinon.stub(REST.prototype, 'list').callsFake((uri) => {
      assert.equal(uri, 'attribute', 'default uri');
      return Promise.resolve();
    });

    const rest = new REST({
      log,
    });
    try {
      await rest.attributes();
    } catch (e) {
      assert.fail(`unexpected failure: ${String(e)}`);
    } finally {
      stub.restore();
    }
  });
});
