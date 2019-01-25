import REST from '../../src/rest';
import * as utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.fetchContent', () => {
  it('must invoke get with options', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      assert.deepEqual(options, { skip_url_mangle: true, log }, 'extended options');
      assert.equal(uri, '/a/uri', 'url passed');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.fetchContent('/a/uri', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });
});
