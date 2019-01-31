import sinon from 'sinon';
import assert from 'assert';
import EPI2ME from '../../src/epi2me';

describe('epi2me.autoJoin', () => {
  const stubs = [];

  function newApi(error, instance) {
    const client = new EPI2ME();
    stubs.forEach(s => {
      s.restore();
    });

    stubs.push(
      sinon.stub(client.REST, 'workflow_instance').callsFake((id, cb) => {
        cb(error, instance);
      }),
    );

    stubs.push(
      sinon.stub(client, 'autoConfigure').callsFake((id, cb) => {
        cb();
      }),
    );

    sinon.stub(client.log, 'warn');

    return client;
  }

  it('should join an existing workflow instance', done => {
    const client = newApi(null, {
      id_workflow_instance: 10,
      id_user: 'user',
      outputqueue: 'queue',
    });

    assert.doesNotThrow(() => {
      client.autoJoin(111, () => {
        assert(client.REST.workflow_instance.calledOnce);
        assert(client.autoConfigure.calledOnce);

        const args = client.autoConfigure.args[0][0];
        assert.equal(args.id_workflow_instance, 10);
        assert.equal(args.id_user, 'user');
        assert.equal(args.outputqueue, 'queue');
      });
    });
    done();
  });

  it('should handle workflow_instance errors', done => {
    const client = newApi(
      {
        error: 'Message',
      },
      {
        state: 'stopped',
      },
    );

    assert.doesNotThrow(() => {
      client.autoJoin(111, () => {
        assert(client.REST.workflow_instance.calledOnce);
        assert(client.log.warn.calledOnce);
        assert(client.log.warn.calledWith('Failed to join workflow instance: Message'));
        assert(client.autoConfigure.notCalled);
      });
    });
    done();
  });

  it('should not join an instance where state === stopped', done => {
    const client = newApi({
      state: 'stopped',
    });

    assert.doesNotThrow(() => {
      client.autoJoin(111, () => {
        assert(client.REST.workflow_instance.calledOnce);
        assert(client.autoConfigure.notCalled);
        // assert(client.log.warn.calledWith("workflow 111 is already stopped"));
      });
    });
    done();
  });
});
