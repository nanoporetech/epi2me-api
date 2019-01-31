const proxyquire = require('proxyquire');
const assert = require('assert');
const sinon = require('sinon');

const requestProxy = {};
const fsProxy = {};
const mkdirpProxy = {};
const awsProxy = {};
proxyquire('../../src/utils', {
  request: requestProxy,
});
const EPI2ME = proxyquire('../../src/epi2me', {
  'aws-sdk': awsProxy,
  'fs-extra': fsProxy,
  mkdirp: mkdirpProxy,
}).default;

describe('epi2me.autoStart', () => {
  function newApi(error, instance) {
    const client = new EPI2ME();
    client.REST.start_workflow = (id, cb) => {
      cb(error, instance);
    };

    client.autoConfigure = (id, cb) => {
      cb();
    };

    sinon.stub(client.log, 'warn');
    sinon.spy(client, 'autoConfigure');
    sinon.spy(client.REST, 'start_workflow');
    return client;
  }

  it('should initiate a new workflow instance', () => {
    const client = newApi(null, {
      id_workflow_instance: 10,
      id_user: 'user',
      outputqueue: 'queue',
    });

    client.autoStart(111, () => {
      assert(client.REST.start_workflow.calledOnce);
      assert(client.autoConfigure.calledOnce);

      const args = client.autoConfigure.args[0][0];
      assert.equal(args.id_workflow_instance, 10);
      assert.equal(args.id_user, 'user');
      assert.equal(args.outputqueue, 'queue');
    });
  });

  it('should handle start_workflow errors', () => {
    const client = newApi(
      {
        error: 'Message',
      },
      {
        state: 'stopped',
      },
    );

    client.autoStart(111, () => {
      assert(client.REST.start_workflow.calledOnce);
      assert(client.log.warn.calledOnce);
      assert(client.log.warn.calledWith('Failed to start workflow: Message'));
      assert(client.autoConfigure.notCalled);
    });
  });
});
