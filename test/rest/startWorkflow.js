import assert from 'assert';
import sinon from 'sinon';
import utils from '../../src/utils';
import REST from '../../src/rest';

describe('rest.startWorkflow', () => {
  let client;

  beforeEach(() => {
    client = new REST({
      url: 'http://metrichor.local:8080',
      apikey: 'FooBar02',
    });
  });

  it('should start a workflow_instance', async () => {
    const stub = sinon.stub(utils, 'post').callsFake((uri, obj, options) => {
      assert.equal(uri, 'workflow_instance');
      assert.equal(options.apikey, 'FooBar02');
      assert.equal(obj.id_workflow, 'test');
      return {
        id_workflow_instance: '1',
        id_user: '1',
      };
    });

    let response;
    try {
      response = await client.startWorkflow({
        id_workflow: 'test',
      });
    } catch (e) {
      assert.fail(`unexpected error ${String(e)}`);
    }

    assert.deepEqual(
      response,
      {
        id_workflow_instance: '1',
        id_user: '1',
      },
      'workflow_instance start response',
    );
    stub.restore();
  });
});
