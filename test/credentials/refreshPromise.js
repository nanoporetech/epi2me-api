import assert from 'assert';
import sinon, { stub } from 'sinon';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';
import { Epi2meCredentials } from '../../src/credentials';

describe('credentials', () => {
  let instanceID = 0;
  let referenceDate = Date.now();

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
  const tokenFactory = (instID, expiration = 0) => ({
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
  const credentialsFactory = (fetchToken, sessionGrace = 0) => {
    instanceID += 1;
    return new Epi2meCredentials(fetchToken || stub().resolves(tokenFactory(instanceID)), sessionGrace);
  };

  describe('refreshPromise', () => {
    it('refreshPromise updates credentials', async () => {
      const fetchToken = stub().resolves(tokenFactory(1, 10));

      const creds = credentialsFactory(fetchToken);
      var { accessKeyId, secretAccessKey, sessionToken, expired, expireTime } = creds;

      assert.deepStrictEqual(
        { accessKeyId, secretAccessKey, sessionToken, expired, expireTime },
        { accessKeyId: '', secretAccessKey: '', sessionToken: '', expired: false, expireTime: null },
        'initialisation values correct',
      );

      assert.strictEqual(creds.needsRefresh(), true, 'Does need refresh following initialisation');

      await creds.refreshPromise();

      assert.strictEqual(fetchToken.callCount, 1, 'tokenFetchHandler called on refresh');

      var { accessKeyId, secretAccessKey, sessionToken, expired, expireTime } = creds;
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
    });
  });
});
