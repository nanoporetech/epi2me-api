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

  it('must invoke read with id', () => {
    rest.options.local = false;
    sinon.stub(rest, '_read').callsFake((type, id, cb) => {
      assert.equal(type, 'dataset', 'type passed');
      assert.equal(id, 27, 'id passed');
      cb();
    });
    const fake = sinon.fake();

    assert.doesNotThrow(() => {
      rest.dataset(27, fake);
    });
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must filter local datasets', () => {
    rest.options.local = true;

    sinon
      .stub(rest, 'datasets')
      .callsFake(cb => cb(null, [{ id_dataset: 1, name: 'one' }, { id_dataset: 27, name: 'twenty seven' }]));

    const fake = sinon.fake();

    assert.doesNotThrow(() => {
      rest.dataset(27, fake);
    });

    assert(fake.calledOnce, 'callback invoked');
    assert.deepEqual(fake.args[0], [null, { id_dataset: 27, name: 'twenty seven' }], 'callback with dataset object');
  });
});
