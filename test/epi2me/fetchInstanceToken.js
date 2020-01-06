import assert from 'assert';
import sinon from 'sinon';
import {
  merge
} from 'lodash';
import AWS from 'aws-sdk';
import EPI2ME from '../../src/epi2me';

describe('epi2me.fetchInstanceToken', () => {
  const clientFactory = opts =>
    new EPI2ME(
      merge({
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            json: sinon.stub(),
          },
        },
        opts,
      ),
    );

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should throw if no id_workflow_instance', async () => {
    const client = clientFactory();

    let err;
    try {
      await client.fetchInstanceToken();
    } catch (e) {
      err = e;
    }
    assert(String(err).match(/must specify id_workflow_instance/), 'correct error thrown');
  });

  it('should request a token if not present', async () => {
    const client = clientFactory({
      id_workflow_instance: 5,
    });

    const stub = sinon.stub(client.REST, 'instanceToken').resolves();
    client.states.sts_expiration = Date.now() - 10000; // expired
    try {
      await client.fetchInstanceToken();
      assert(stub.calledOnce, 'callback fired if expired');
    } catch (err) {
      assert.fail(err);
    }
  });

  it('should handle token-fetching error and retry', async () => {
    const client = clientFactory({
      id_workflow_instance: 5,
    });

    const stub = sinon.stub(client.REST, 'instanceToken').rejects(new Error('token error'));

    client.states.sts_expiration = Date.now() - 10000; // expired
    try {
      await client.fetchInstanceToken();
      assert(stub.calledOnce, 'callback fired if expired');
    } catch (err) {
      assert.fail(err);
    }
  });

  it('should fetch token and callback', async () => {
    const client = clientFactory({
      id_workflow_instance: 5,
    });

    const token = {
      expiration: new Date(),
    };
    const stub = sinon.stub(client.REST, 'instanceToken').resolves(token);
    const stub2 = sinon.stub(AWS.config, 'update').callsFake();

    client.states.sts_expiration = Date.now() - 10000; // expired
    try {
      await client.fetchInstanceToken();
    } catch (err) {
      assert.fail(err);
    }

    assert(stub.calledOnce, 'callback fired if expired');
    assert.ok(stub2.calledOnce);
    assert.deepEqual(stub2.args[0][0], merge({"region":"eu-west-1"}, token), 'token contents');
    stub2.restore();
  });

  it('should set proxy if configured', async () => {
    const client = clientFactory({
      id_workflow_instance: 5,
      proxy: 'http://proxy.test:3128/',
    });
    const token = {
      expiration: new Date(),
    };
    const stub = sinon.stub(client.REST, 'instanceToken').resolves(token);
    const stub2 = sinon.stub(AWS.config, 'update').callsFake();
    client.states.sts_expiration = Date.now() - 10000; // expired

    try {
      await client.fetchInstanceToken();
    } catch (err) {
      assert.fail(err);
    }
    assert(stub.calledOnce, 'callback fired if expired');
    assert.ok(stub2.calledOnce);
    assert.equal(
      stub2.args[0][0].httpOptions.agent.proxy.href,
      'http://proxy.test:3128/',
      'tightly coupled proxy contents',
    );
    stub2.restore();
  });
});
