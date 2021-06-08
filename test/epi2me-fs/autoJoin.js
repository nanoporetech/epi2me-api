import sinon from 'sinon';
import assert from 'assert';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.autoJoin', () => {
  const stubs = [];

  function newApi(error, instance) {
    const client = new EPI2ME({
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
    });

    stubs.push(
      sinon.stub(client.REST, 'workflowInstance').callsFake(() => {
        if (error) {
          return Promise.reject(error);
        }
        return Promise.resolve(instance);
      }),
    );

    stubs.push(sinon.stub(client, 'autoConfigure').resolves());

    return client;
  }

  afterEach(() => {
    for (const stub of stubs) {
      stub.restore();
    }
    stubs.length = 0;
  });

  it('should join an existing workflow instance (with callback)', async () => {
    const client = newApi(null, {
      id_workflow_instance: 10,
      id_user: 'user',
      outputqueue: 'queue',
    });

    try {
      await client.autoJoin(111, () => {
        assert(client.REST.workflowInstance.calledOnce);
        assert(client.autoConfigure.calledOnce);

        const args = client.autoConfigure.args[0][0];
        assert.equal(args.id_workflow_instance, 10);
        assert.equal(args.id_user, 'user');
        assert.equal(args.outputqueue, 'queue');
      });
    } catch (err) {
      assert.fail(err);
    }
  });

  it('should handle workflow_instance errors', async () => {
    const client = newApi(new Error('Message'), {
      state: 'stopped',
    });

    try {
      await client.autoJoin(111);
    } catch (e) {
      assert(String(e).match(/Message/));
    }

    assert(client.REST.workflowInstance.calledOnce);
    assert(client.log.warn.calledOnce);
    assert(client.log.warn.calledWith('Failed to join workflow instance: Error: Message'));
    assert(client.autoConfigure.notCalled);
  });

  it('should not join an instance where state === stopped', async () => {
    const client = newApi(null, {
      state: 'stopped',
    });

    try {
      await client.autoJoin(111);
    } catch (e) {
      assert.ok(String(e).match(/could not join/));
    }
    assert(client.REST.workflowInstance.calledOnce);
    assert(client.autoConfigure.notCalled);
    // assert(client.log.warn.calledWith("workflow 111 is already stopped"));
  });
});
