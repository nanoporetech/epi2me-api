import assert from 'assert';
import { merge } from 'lodash';
import sinon from 'sinon';
import EPI2ME from '../../src/epi2me-fs';

describe('epi2me.setClassConfigREST', () => {
  const clientFactory = opts =>
    new EPI2ME(
      merge(
        {
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

  const expected = {
    id_workflow_instance: 1,
    id_workflow: 1,
    remote_addr: 1,
    key_id: 1,
    bucket: 1,
    user_defined: 1,
    start_date: 1,
    id_user: 1,
    inputQueueName: 1,
    outputQueueName: 1,
    region: 1,
    bucketFolder: '1/1/1',
    summaryTelemetry: 1,
    chain: { a: 1 },
  };
  it('sets instance config as expected', async () => {
    const client = clientFactory();
    client.setClassConfigREST({
      id_workflow_instance: 1,
      id_workflow: 1,
      remote_addr: 1,
      key_id: 1,
      bucket: 1,
      user_defined: 1,
      start_date: 1,
      id_user: 1,
      inputqueue: 1,
      outputqueue: 1,
      region: 1,
      telemetry: 1,
      chain: { a: 1 },
    });
    Object.keys(expected).forEach(k => {
      assert.deepStrictEqual(client.config.instance[k], expected[k]);
    });
  });
});
