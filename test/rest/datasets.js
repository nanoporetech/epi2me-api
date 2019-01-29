import REST from '../../src/rest';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.datasets', () => {
  let rest, stubs, log, ringbuf;
  beforeEach(() => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    stubs = [];
    rest = new REST({ log });
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke list with null query', async () => {
    const stub = sinon.stub(rest, 'list').resolves([]);
    const fake = sinon.fake();

    try {
      await rest.datasets(fake);
    } catch (err) {
      assert.fail(err);
    }

    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke list with empty query', async () => {
    const stub = sinon.stub(rest, 'list').resolves([]);
    const fake = sinon.fake();

    try {
      await rest.datasets(fake, {});
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke list with query', async () => {
    const stub = sinon.stub(rest, 'list').resolves([]);
    const fake = sinon.fake();

    try {
      await rest.datasets(fake, { show: 'shared' });
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });
});
