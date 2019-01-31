import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';

describe('rest.ami_images', () => {
  let ringbuf;
  let log;
  let stubs;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke list with null query', () => {
    const fake = sinon.fake();
    const rest = new REST({ log });
    const stub = sinon.stub(rest, 'list').callsFake((uri, cb) => {
      assert.equal(uri, 'ami_image', 'default uri');
      cb();
    });
    stubs.push(stub);
    assert.doesNotThrow(async () => {
      await rest.ami_images(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must bail when local', () => {
    const fake = sinon.fake();
    const rest = new REST({ log, local: true });
    const stub = sinon.stub(rest, 'list').callsFake((uri, cb) => {
      assert.equal(uri, 'ami_image', 'default uri');
      cb();
    });
    stubs.push(stub);
    assert.doesNotThrow(async () => {
      await rest.ami_images(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    assert(fake.firstCall.args[0] instanceof Error);
  });
});
