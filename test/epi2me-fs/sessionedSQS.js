import assert from 'assert';
import AWS from 'aws-sdk';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.sessionedSQS', () => {
  it('should session', () => {
    const client = new EPI2ME({});

    assert.doesNotThrow(() => {
      const sqs = client.sessionedSQS();
      assert.ok(sqs instanceof AWS.SQS);
    });
  });
});
