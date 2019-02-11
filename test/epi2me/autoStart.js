import assert from 'assert';
import sinon from 'sinon';
import EPI2ME from '../../src/epi2me';

describe('epi2me.autoStart', () => {
  function newApi(error, instance) {
    const client = new EPI2ME();
    sinon.stub(client.REST, 'startWorkflow').callsFake(() => {
      if (error) {
        return Promise.reject(error);
      }
      return Promise.resolve(instance);
    });

    sinon.stub(client, 'autoConfigure').callsFake((id, cb) => (cb ? cb() : Promise.resolve()));
    sinon.stub(client.log, 'warn');

    return client;
  }

  it('should initiate a new workflow instance', async () => {
    const client = newApi(null, {
      id_workflow_instance: 10,
      id_user: 'user',
      outputqueue: 'queue',
    });

    await client.autoStart(111, () => {
      assert(client.REST.startWorkflow.calledOnce, 'startWorkflow called once');
      assert(client.autoConfigure.calledOnce, 'autoConfigure called once');

      const args = client.autoConfigure.args[0][0];
      assert.equal(args.id_workflow_instance, 10, 'instance id passed');
      assert.equal(args.id_user, 'user', 'user id passed');
      assert.equal(args.outputqueue, 'queue', 'output queue passed');
    });
  });

  it('should handle startWorkflow errors', async () => {
    const client = newApi(
      {
        error: 'Message',
      },
      {
        state: 'stopped',
      },
    );

    await client.autoStart(111, () => {
      assert(client.REST.startWorkflow.calledOnce, 'startWorkflow called once');
      assert(client.log.warn.calledWith('Failed to start workflow: Message'), 'logged warning');
      assert(client.autoConfigure.notCalled, 'autoConfigure not called');
    });
  });
});
