import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';

describe('rest.workflowInstances', () => {
  let ringbuf;
  let rest;
  let log;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    rest = new REST({
      log,
    });
  });

  it('must invoke list with promise', async () => {
    const stub = sinon.stub(rest, 'list').resolves([
      {
        id_workflow_instance: '12345',
      },
    ]);

    try {
      const data = await rest.workflowInstances();
      assert.deepEqual(data, [
        {
          id_workflow_instance: '12345',
        },
      ]);
    } catch (err) {
      assert.fail(err);
    }

    stub.restore();
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
    try {
      const data = await rest.workflowInstances({
        run_id: 'abcdefabcdef',
      });
      assert.deepEqual(data, [
        // note extra "data" container
        {
          id_workflow_instance: 1,
          id_workflow: 2,
          run_id: 'abcdefabcdef',
          description: 'test wf 2',
          rev: '0.0.1',
        },
      ]);
      assert.equal(
        stub.args[0][0],
        'workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=abcdefabcdef;',
        'query uri',
      );
    } catch (err) {
      assert.fail(err);
    } finally {
      stub.restore();
    }
  });
});
