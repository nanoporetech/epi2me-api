import assert from 'assert';
import sinon from 'sinon';
import REST from '../../src/rest';

describe('rest.workflowInstance', () => {
  let rest;

  beforeEach(() => {
    rest = new REST({
      url: 'http://metrichor.local:8080',
      apikey: 'FooBar02',
    });
  });

  it('should read a workflowInstance with promise', async () => {
    const stub = sinon.stub(rest, 'read').resolves({
      id_workflow_instance: '149',
      state: 'running',
      workflow_filename: 'DNA_Sequencing.js',
      start_requested_date: '2013-09-16 09:25:15',
      stop_requested_date: '2013-09-16 09:26:04',
      start_date: '2013-09-16 09:25:17',
      stop_date: '2013-09-16 09:26:11',
      control_url: '127.0.0.1:8001',
      data_url: 'localhost:3006',
    });

    try {
      const obj = await rest.workflowInstance(149);

      assert.deepEqual(
        obj, {
          id_workflow_instance: '149',
          state: 'running',
          workflow_filename: 'DNA_Sequencing.js',
          start_requested_date: '2013-09-16 09:25:15',
          stop_requested_date: '2013-09-16 09:26:04',
          start_date: '2013-09-16 09:25:17',
          stop_date: '2013-09-16 09:26:11',
          control_url: '127.0.0.1:8001',
          data_url: 'localhost:3006',
        },
        'workflow read',
      );
    } catch (err) {
      assert.fail(err);
    } finally {
      stub.restore();
    }
  });
});
