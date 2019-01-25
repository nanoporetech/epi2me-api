import REST from '../../src/rest-fs';
import * as utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');
const tmp = require('tmp');
const fs = require('fs-extra');
const path = require('path');

describe('rest-fs.workflow_instances', () => {
  let ringbuf;
  let log;
  let stubs;
  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke list', () => {
    const rest = new REST({ log });
    const stub = sinon.stub(rest, '_list').callsFake((uri, cb) => {
      assert.equal(uri, 'workflow_instance', 'default uri');
      cb();
    });
    stubs.push(stub);

    const fake = sinon.fake();
    assert.doesNotThrow(() => {
      rest.workflow_instances(fake);
    });
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke get with query', () => {
    const stub = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      assert.equal(
        uri,
        'workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=abcdefabcdef;',
        'query uri',
      );
      cb(null, { data: [{ id_ins: 1, id_flo: 2, run_id: 'abcdefabcdef', desc: 'test wf 2', rev: '0.0.1' }] });
    });
    stubs.push(stub);

    const fake = sinon.fake();
    const rest = new REST({ log });
    assert.doesNotThrow(() => {
      rest.workflow_instances(fake, { run_id: 'abcdefabcdef' });
    });
    assert(fake.calledOnce, 'callback invoked');
    sinon.assert.calledWith(fake, null, [
      { id_workflow_instance: 1, id_workflow: 2, run_id: 'abcdefabcdef', description: 'test wf 2', rev: '0.0.1' },
    ]);
  });

  it('must list from filesystem', () => {
    const dir = tmp.dirSync({ unsafeCleanup: true }).name;

    fs.mkdirpSync(path.join(dir, 'instances', '2018-09-10T14-31-04.751Z'));
    fs.mkdirpSync(path.join(dir, 'instances', '2018-09-10T14-29-48.061Z'));
    fs.mkdirpSync(path.join(dir, 'instances', '2018-10-02T12-25-48.061Z'));

    const wf = { id_workflow: 34567, description: 'test flow', rev: '12.34' };
    fs.writeFileSync(path.join(dir, 'instances', '2018-09-10T14-31-04.751Z', 'workflow.json'), JSON.stringify(wf));
    fs.writeFileSync(path.join(dir, 'instances', '2018-09-10T14-29-48.061Z', 'workflow.json'), JSON.stringify(wf));
    fs.writeFileSync(path.join(dir, 'instances', '2018-10-02T12-25-48.061Z', 'workflow.json'), 'corrupt json');

    const rest = new REST({ log, local: true, url: dir });
    const fake = sinon.fake();

    new Promise((accept, reject) => {
      rest.workflow_instances((err, data) => {
        if (err) reject(fake(err));
        accept(fake(null, data));
      });
    }).then(() => {
      sinon.assert.calledOnce(fake);
      sinon.assert.calledWith(fake, null, [
        {
          description: 'test flow',
          filename: `${dir}/instances/2018-09-10T14-29-48.061Z/workflow.json`,
          id_workflow: 34567,
          id_workflow_instance: '2018-09-10T14-29-48.061Z',
          rev: '12.34',
        },
        {
          description: 'test flow',
          filename: `${dir}/instances/2018-09-10T14-31-04.751Z/workflow.json`,
          id_workflow: 34567,
          id_workflow_instance: '2018-09-10T14-31-04.751Z',
          rev: '12.34',
        },
        {
          description: '-',
          filename: `${dir}/instances/2018-10-02T12-25-48.061Z/workflow.json`,
          id_workflow: '-',
          id_workflow_instance: '2018-10-02T12-25-48.061Z',
          rev: '0.0',
        },
      ]);
    });
  });

  it('must bail when local with query', () => {
    const fake = sinon.fake();
    const rest = new REST({ log, local: true });
    assert.doesNotThrow(() => {
      rest.workflow_instances(fake, 'a query');
    });
    assert(fake.calledOnce, 'callback invoked');
    assert(fake.firstCall.args[0] instanceof Error);
  });
});
