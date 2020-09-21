import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import { REST } from '../../src/rest';

describe('rest.amiImages', () => {
  let ringbuf;
  let log;
  let stubs;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('must invoke list with null query', async () => {
    const rest = new REST({
      log,
    });
    const stub = sinon.stub(rest, 'list').callsFake((uri) => {
      assert.equal(uri, 'ami_image', 'default uri');
    });
    stubs.push(stub);
    try {
      await rest.amiImages();
    } catch (e) {
      assert.fail(`unexpected failure: ${String(e)}`);
    }
  });

  it('must bail when local', async () => {
    const rest = new REST({
      log,
      local: true,
    });
    const stub = sinon.stub(rest, 'list').callsFake((uri) => {
      assert.equal(uri, 'ami_image', 'default uri');
    });
    stubs.push(stub);
    try {
      await rest.amiImages();
      assert.fail(`unexpected success`);
    } catch (e) {
      assert(String(e).match(/amiImages unsupported in local mode/));
    }
  });
});
