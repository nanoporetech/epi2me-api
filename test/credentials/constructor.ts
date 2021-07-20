import assert from 'assert';
import { Epi2meCredentials } from '../../src/credentials';
import { Duration } from '../../src/Duration';

describe('credentials', () => {
  describe('constructor', () => {
    it('should construct', () => {
      try {
        const credentials = new Epi2meCredentials(async () => {
          throw new Error('should not be called');
        });
        assert.ok(credentials instanceof Epi2meCredentials, 'Epi2meCredentials instantiated ok');
      } catch (e) {
        assert.fail('Epi2meCredentials failed to instantiate');
      }
    });

    it('set an expiryTime based on sessionGrace', async () => {
      const referenceDate = new Date();
      const token = {
        accessKeyId: 'ACCESSKEYID-X',
        secretAccessKey: 'SECRETACCESSKEY-X',
        sessionToken: 'SESSIONTOKEN-X',
        expiration: referenceDate.toISOString(),
      };
      let credentials = new Epi2meCredentials(async () => token);
      await credentials.refreshPromise();
      assert.strictEqual(
        credentials.expireTime.getTime(),
        referenceDate.getTime(),
        'Default sessionGrace of 0: expiration in == expiration out',
      );

      credentials = new Epi2meCredentials(async () => token, Duration.Seconds(60));
      await credentials.refreshPromise();
      assert.strictEqual(
        credentials.expireTime.getTime(),
        referenceDate.getTime() - 60 * 1000,
        'SessionGrace of 60: expiration in == expiration out - 60s',
      );
    });
  });
});
