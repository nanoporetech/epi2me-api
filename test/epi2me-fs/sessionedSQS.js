import assert from 'assert';
import sinon from 'sinon';
import AWS from 'aws-sdk';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.sessionedSQS', () => {
  it('should session', () => {
    const client = new EPI2ME({});

    client.sessionManager = {
      session: () => {},
    };
    sinon.stub(client.sessionManager, 'session').resolves();

    assert.doesNotThrow(async () => {
      const sqs = await client.sessionedSQS();
      assert.ok(sqs instanceof AWS.SQS);
    });
  });
});
