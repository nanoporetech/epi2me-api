import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import tmp from 'tmp';
import utils from '../../src/utils';
import REST from '../../src/rest-fs';

describe('rest-fs.bundle_workflow', () => {
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

  it('must invoke pipe with options', () => {
    const progress = sinon.fake();
    const stub = sinon.stub(utils, 'pipe').callsFake((uri, filepath, options, progressCb) => {
      assert.deepEqual(options, rest.options, 'options passed');
      assert.equal(uri, 'workflow/bundle/1234.tar.gz', 'url passed');
      progressCb(0.5);
      progressCb(1);
      return Promise.resolve();
    });

    assert.doesNotThrow(() => {
      rest.bundle_workflow('1234', '/path/to/1234', progress);
    });

    assert(progress.calledTwice, 'progress callback invoked');
    stub.restore();
  });
});
