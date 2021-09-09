import assert from 'assert';
import AWS from 'aws-sdk';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.sessionedS3', () => {
  it('should session', () => {
    const client = new EPI2ME({});
    assert.doesNotThrow(() => {
      const s3 = client.sessionedS3();
      assert.ok(s3 instanceof AWS.S3);
    });
  });
});
