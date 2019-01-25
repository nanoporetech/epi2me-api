import REST from '../../src/rest';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.datasets', () => {
  it('must invoke list with null query', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(REST.prototype, '_list').callsFake((uri, cb) => {
      assert.equal(uri, 'dataset?show=mine', 'default uri');
      cb();
    });
    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.datasets(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must invoke list with empty query', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(REST.prototype, '_list').callsFake((uri, cb) => {
      assert.equal(uri, 'dataset?show=mine', 'default uri');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.datasets(fake, {});
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must invoke list with query', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(REST.prototype, '_list').callsFake((uri, cb) => {
      assert.equal(uri, 'dataset?show=shared', 'default uri');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.datasets(fake, { show: 'shared' });
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
