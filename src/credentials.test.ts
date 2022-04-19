import assert from 'assert';
import { stub } from 'sinon';
import type { Index } from 'ts-runtime-typecheck';
import { Epi2meCredentials } from './credentials';
import { Duration } from './Duration';

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

describe('credentials', () => {
  let instanceID = 0;
  const referenceDate = Date.now();

  /**
   *
   * @param {number} deltaSeconds
   * @returns string
   */
  const getExpiration = (deltaSeconds = 0) => new Date(referenceDate + 1000 * deltaSeconds).toISOString();

  /**
   *
   * @param {number} instID
   * @returns InstanceTokenMutation
   */
  const tokenFactory = (instID: Index, expiration = 0) => ({
    idWorkflowInstance: '' + instID,
    accessKeyId: `ACCESSKEYID-${instID}`,
    secretAccessKey: `SECRETACCESSKEY-${instID}`,
    sessionToken: `SESSIONTOKEN-${instID}`,
    expiration: getExpiration(expiration),
    region: 'xx-fake-1',
  });

  /**
   *
   * @returns Epi2meCredentials
   */
  const credentialsFactory = (fetchToken: ConstructorParameters<typeof Epi2meCredentials>[0]) => {
    instanceID += 1;
    return new Epi2meCredentials(fetchToken || stub().resolves(tokenFactory(instanceID)), Duration.ZERO);
  };

  describe('refreshPromise', () => {
    it('refreshPromise updates credentials', async () => {
      const fetchToken = stub().resolves(tokenFactory(1, 10));

      const creds = credentialsFactory(fetchToken);
      {
        const { accessKeyId, secretAccessKey, sessionToken, expired, expireTime } = creds;

        assert.deepStrictEqual(
          { accessKeyId, secretAccessKey, sessionToken, expired, expireTime },
          { accessKeyId: '', secretAccessKey: '', sessionToken: '', expired: false, expireTime: null },
          'initialisation values correct',
        );

        assert.strictEqual(creds.needsRefresh(), true, 'Does need refresh following initialisation');

        await creds.refreshPromise();

        assert.strictEqual(fetchToken.callCount, 1, 'tokenFetchHandler called on refresh');
      }
      {
        const { accessKeyId, secretAccessKey, sessionToken, expired, expireTime } = creds;
        assert.deepStrictEqual(
          { accessKeyId, secretAccessKey, sessionToken, expired },
          {
            accessKeyId: `ACCESSKEYID-${instanceID}`,
            secretAccessKey: `SECRETACCESSKEY-${instanceID}`,
            sessionToken: `SESSIONTOKEN-${instanceID}`,
            expired: false,
          },
          'initialisation values correct',
        );
        assert.ok(expireTime instanceof Date, 'expireTime is correctly updated');
        assert.ok(
          expireTime.getTime() === new Date(referenceDate + 10 * 1000).getTime(),
          'expireTime is correctly updated',
        );
      }
    });
  });
});
