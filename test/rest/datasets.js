import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';

describe('rest.datasets', () => {
  let rest;
  let stubs;
  let log;
  let ringbuf;
  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    stubs = [];
    rest = new REST({ log });
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke list with null query', async () => {
    sinon.stub(rest, 'list').resolves([]);
    const fake = sinon.fake();

    try {
      await rest.datasets(fake);
    } catch (err) {
      assert.fail(err);
    }

    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke list with empty query', async () => {
    sinon.stub(rest, 'list').resolves([]);
    const fake = sinon.fake();

    try {
      await rest.datasets(fake, {});
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke list with query', async () => {
    sinon.stub(rest, 'list').resolves([]);
    const fake = sinon.fake();

    try {
      await rest.datasets(fake, { show: 'shared' });
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });
});
