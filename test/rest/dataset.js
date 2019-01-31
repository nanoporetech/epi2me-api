import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import tmp from 'tmp';
import REST from '../../src/rest';

describe('rest.dataset', () => {
  let rest;
  let log;
  let ringbuf;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    rest = new REST({
      log,
      local: true,
      url: tmp.dirSync().name,
    });
  });

  it('must invoke read with id', async () => {
    rest.options.local = false;
    sinon.stub(rest, 'read').resolves({ id_dataset: 1 });
    const fake = sinon.fake();

    try {
      await rest.dataset(27, fake);
    } catch (err) {
      assert.fail(err);
    }

    assert(fake.calledOnce, 'callback invoked');
  });

  it('must filter local datasets', async () => {
    rest.options.local = true;

    sinon.stub(rest, 'datasets').resolves([{ id_dataset: 1, name: 'one' }, { id_dataset: 27, name: 'twenty seven' }]);

    const fake = sinon.fake();

    try {
      await rest.dataset(27, fake);
    } catch (err) {
      assert.fail(err);
    }

    assert(fake.calledOnce, 'callback invoked');
    assert.deepEqual(fake.args[0], [null, { id_dataset: 27, name: 'twenty seven' }], 'callback with dataset object');
  });
});
