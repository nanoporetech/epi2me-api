import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import REST from '../../src/rest';
import * as utils from '../../src/utils';

describe('rest.workflow_instances', () => {
  let ringbuf, rest, stubs, log;
  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    rest = new REST({ log });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke list with callback', async () => {
    const stub = sinon.stub(rest, 'list').resolves([]);
    const fake = sinon.fake();

    try {
      await rest.workflow_instances(fake);
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke list with promise', async () => {
    const stub = sinon.stub(rest, 'list').resolves([{ id_workflow_instance: '12345' }]);

    try {
      let data = await rest.workflow_instances();
      assert.deepEqual(data, [{ id_workflow_instance: '12345' }]);
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must invoke get with query', async () => {
    const stub = sinon
      .stub(utils, 'get')
      .resolves({ data: [{ id_ins: 1, id_flo: 2, run_id: 'abcdefabcdef', desc: 'test wf 2', rev: '0.0.1' }] });

    try {
      let data = await rest.workflow_instances({ run_id: 'abcdefabcdef' });
      assert.deepEqual(data, [
        // note extra "data" container
        { id_workflow_instance: 1, id_workflow: 2, run_id: 'abcdefabcdef', description: 'test wf 2', rev: '0.0.1' },
      ]);
    } catch (err) {
      assert.fail(err);
    }

    assert.equal(
      stub.args[0][0],
      'workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=abcdefabcdef;',
      'query uri',
    );

    stub.restore();
  });
});
