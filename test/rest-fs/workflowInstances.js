import sinon from 'sinon';
import assert from 'assert';
import tmp from 'tmp';
import bunyan from 'bunyan';
import fs from 'fs-extra';
import path from 'path';
import { REST_FS as REST } from '../../src/rest-fs';
import { utils } from '../../src/utils';

describe('rest-fs.workflowInstances', () => {
  let ringbuf;
  let log;
  let stubs;
  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('must invoke list', async () => {
    const rest = new REST({
      log,
    });
    const stub = sinon.stub(rest, 'list').resolves();
    stubs.push(stub);

    try {
      await rest.workflowInstances();
    } catch (err) {
      assert.fail(`unexpected failure: ${String(err)}`);
    }
  });

  it('must invoke get with query', async () => {
    const stub = sinon.stub(utils, 'get').resolves({
      data: [
        {
          id_ins: 1,
          id_flo: 2,
          run_id: 'abcdefabcdef',
          desc: 'test wf 2',
          rev: '0.0.1',
        },
      ],
    });
    stubs.push(stub);

    const rest = new REST({
      log,
    });
    let response;
    try {
      response = await rest.workflowInstances({
        run_id: 'abcdefabcdef',
      });
    } catch (err) {
      assert.fail(err);
    }

    assert.deepEqual(response, [
      {
        id_workflow_instance: 1,
        id_workflow: 2,
        run_id: 'abcdefabcdef',
        description: 'test wf 2',
        rev: '0.0.1',
      },
    ]);
  });

  it('must list from filesystem', async () => {
    const dir = tmp.dirSync({
      unsafeCleanup: true,
    }).name;

    fs.mkdirpSync(path.join(dir, 'instances', '2018-09-10T14-31-04.751Z'));
    fs.mkdirpSync(path.join(dir, 'instances', '2018-09-10T14-29-48.061Z'));
    fs.mkdirpSync(path.join(dir, 'instances', '2018-10-02T12-25-48.061Z'));

    const wf = {
      id_workflow: 34567,
      description: 'test flow',
      rev: '12.34',
    };
    fs.writeFileSync(path.join(dir, 'instances', '2018-09-10T14-31-04.751Z', 'workflow.json'), JSON.stringify(wf));
    fs.writeFileSync(path.join(dir, 'instances', '2018-09-10T14-29-48.061Z', 'workflow.json'), JSON.stringify(wf));
    fs.writeFileSync(path.join(dir, 'instances', '2018-10-02T12-25-48.061Z', 'workflow.json'), 'corrupt json');

    const rest = new REST({
      log,
      local: true,
      url: dir,
    });

    const response = await rest.workflowInstances();

    assert.deepEqual(response, [
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

  it('must bail when local with query', async () => {
    const rest = new REST({
      log,
      local: true,
    });
    let err;
    try {
      await rest.workflowInstances('a query');
    } catch (e) {
      err = e;
    }

    assert(err instanceof Error);
  });
});
