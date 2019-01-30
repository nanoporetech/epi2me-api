import assert from 'assert';
import sinon from 'sinon';
import AWS from 'aws-sdk';
import EPI2ME from '../../src/epi2me';

describe('epi2me.sessionedS3', () => {
  it('should session', () => {
    const client = new EPI2ME({});

    sinon.stub(client, 'session').resolves();

    assert.doesNotThrow(async () => {
      const s3 = await client.sessionedS3();
      assert.ok(s3 instanceof AWS.S3);
    });
  });
});
