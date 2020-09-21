import assert from 'assert';
import bunyan from 'bunyan';
import sinon from 'sinon';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';

describe('rest.fetchContent', () => {
  it('must invoke get with options', () => {
    const ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    const log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    const stub = sinon.stub(utils, 'get').resolves((uri, options) => {
      assert.deepEqual(
        options,
        {
          skip_url_mangle: true,
          log,
        },
        'extended options',
      );
      assert.equal(uri, '/a/uri', 'url passed');
    });

    const rest = new REST({
      log,
    });
    try {
      rest.fetchContent('/a/uri');
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }
  });
});
