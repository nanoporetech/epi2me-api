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
    ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    stubs = [];
    rest = new REST({
      log,
    });
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('must invoke list with null query', async () => {
    const stub = sinon.stub(rest, 'list').resolves([]);
    stubs.push(stub);
    try {
      await rest.datasets();
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must invoke list with empty query', async () => {
    const stub = sinon.stub(rest, 'list').resolves([]);
    stubs.push(stub);
    try {
      await rest.datasets({});
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must invoke list with query', async () => {
    const stub = sinon.stub(rest, 'list').resolves([]);
    stubs.push(stub);
    try {
      await rest.datasets({
        show: 'shared',
      });
    } catch (err) {
      assert.fail(err);
    }
  });
});
