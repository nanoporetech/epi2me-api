import REST from '../../src/rest';
import * as utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');
const tmp = require('tmp');
const fs = require('fs-extra');
const path = require('path');

describe('rest.workflow_instances', () => {
  it('must invoke list', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(REST.prototype, '_list').callsFake((uri, cb) => {
      assert.equal(uri, 'workflow_instance', 'default uri');
      cb();
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.workflow_instances(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must invoke get with query', () => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    const stub = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      assert.equal(
        uri,
        'workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=abcdefabcdef;',
        'query uri',
      );
      cb(null, { data: [{ id_ins: 1, id_flo: 2, run_id: 'abcdefabcdef', desc: 'test wf 2', rev: '0.0.1' }] });
    });

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.workflow_instances(fake, { run_id: 'abcdefabcdef' });
    });
    assert(fake.calledOnce, 'callback invoked');
    sinon.assert.calledWith(fake, null, [
      { id_workflow_instance: 1, id_workflow: 2, run_id: 'abcdefabcdef', description: 'test wf 2', rev: '0.0.1' },
    ]);
    stub.restore();
  });
});
