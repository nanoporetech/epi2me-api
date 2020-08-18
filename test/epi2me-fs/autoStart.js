import assert from 'assert';
import sinon from 'sinon';
import fs from 'fs-extra';
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

  it('puts out telemetry on an observable', async () => {
    const client = new EPI2ME({
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        json: sinon.stub(),
      },
    });

    sinon.stub(fs, 'writeJSONSync');

    client.REST.fetchContent = async (url) => ({
      dummy: url,
    });

    let theTelemetry;
    client.config.instance.id_workflow_instance = '666';
    client.config.instance.summaryTelemetry = {
      '1915': {
        '16S Microbial [rev 2020.1.6-1141]':
          'https://epi2me-dev.nanoporetech.com/workflow_instance/666/classification_16s_barcode-v1.json',
      },
      '1936': {
        'metrichor-bio/ont-metrichor-homogeniser:3223479 [rev 2020.1.18-1510]':
          'https://epi2me-dev.nanoporetech.com/workflow_instance/666/basecalling_1d_barcode-v1.json',
      },
    };
    const sub = client.instanceTelemetry$.subscribe((telemetry) => {
      theTelemetry = telemetry;
    });
    assert.deepEqual(theTelemetry, []);
    client.instanceTelemetry$.next({ foo: 'bar' });
    assert.deepEqual(theTelemetry, { foo: 'bar' });

    let fetchTelemetryResponse;
    try {
      fetchTelemetryResponse = await client.fetchTelemetry();
    } catch (err) {
      assert.fail(err);
    }
    assert.equal(fetchTelemetryResponse, undefined);
    assert.deepEqual(theTelemetry, [
      {
        dummy: 'https://epi2me-dev.nanoporetech.com/workflow_instance/666/classification_16s_barcode-v1.json',
      },
      {
        dummy: 'https://epi2me-dev.nanoporetech.com/workflow_instance/666/basecalling_1d_barcode-v1.json',
      },
    ]);

    sub.unsubscribe();
    // client.stopSubscription();
  });
});
