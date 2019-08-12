import assert from 'assert';
import sinon from 'sinon';
import EPI2ME from '../../src/epi2me-fs';

describe('epi2me.autoStart', () => {
  function newApi(error, instance) {
    const client = new EPI2ME({
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        json: sinon.stub(),
      },
    });

    if (error) {
      sinon.stub(client.REST, 'startWorkflow').rejects(error);
    } else {
      sinon.stub(client.REST, 'startWorkflow').resolves(instance);
    }
    sinon.stub(client, 'autoConfigure').resolves();

    return client;
  }

  it('should initiate a new workflow instance', async () => {
    const client = newApi(null, {
      id_workflow_instance: 10,
      id_user: 'user',
      outputqueue: 'queue',
    });

    try {
      await client.autoStart(111);
    } catch (err) {
      assert.fail(err);
    }

    assert(client.REST.startWorkflow.calledOnce, 'startWorkflow called once');
    assert(client.autoConfigure.calledOnce, 'autoConfigure called once');

    const args = client.autoConfigure.args[0][0];
    assert.equal(args.id_workflow_instance, 10, 'instance id passed');
    assert.equal(args.id_user, 'user', 'user id passed');
    assert.equal(args.outputqueue, 'queue', 'output queue passed');
  });

  it('should handle startWorkflow errors', async () => {
    const client = newApi(new Error('Message'), {
      state: 'stopped',
    });

    let err;
    try {
      await client.autoStart(111);
    } catch (e) {
      err = e;
    }

    assert(String(err).match(/Message/), 'thrown error message');
    assert(client.REST.startWorkflow.calledOnce, 'startWorkflow called once');
    assert(client.log.warn.calledWith('Failed to start workflow: Error: Message'), 'logged warning');
    assert(client.autoConfigure.notCalled, 'autoConfigure not called');
  });
});
