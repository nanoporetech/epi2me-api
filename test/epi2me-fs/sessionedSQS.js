import assert from 'assert';
import sinon from 'sinon';
import AWS from 'aws-sdk';
import EPI2ME from '../../src/epi2me-fs';

describe('epi2me.sessionedSQS', () => {
  it('should session', () => {
    const client = new EPI2ME({});

    sinon.stub(client, 'session').resolves();

    assert.doesNotThrow(async () => {
      const sqs = await client.sessionedSQS();
      assert.ok(sqs instanceof AWS.SQS);
    });
  });
});
