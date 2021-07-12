import assert from 'assert';
import sinon, { stub } from 'sinon';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me-fs', () => {
  let instanceID = 0;

  /**
   *
   * @returns Epi2meCredentials
   */
  const instanceFactory = () => {
    instanceID += 1;

    const API = new EPI2ME({
      id_workflow_instance: instanceID,
      sessionGrace: 5,
      useGraphQL: false,
    });
    API.REST = {
      instanceToken: stub().resolves('TOKEN::REST'),
    };
    API.graphQL = {
      instanceToken: stub().resolves({
        data: {
          token: 'TOKEN::GRAPHQL',
        },
      }),
    };

    return API;
  };

  describe('fetchToken', () => {
    it('should fetch a token using REST by default', async () => {
      const inst = instanceFactory();
      const s3 = inst.sessionedS3();
      await s3.config.credentials.refreshPromise();

      assert.strictEqual(inst.REST.instanceToken.callCount, 1, 'REST fetch ok');
      assert.strictEqual(inst.graphQL.instanceToken.callCount, 0, 'no token requested');
    });

    it('should fetch a token using GRAPHQL when configured with useGraphQL', async () => {
      const inst = instanceFactory();
      inst.config.options.useGraphQL = true;
      const s3 = inst.sessionedS3();
      await s3.config.credentials.refreshPromise();

      assert.strictEqual(inst.REST.instanceToken.callCount, 0, 'no token requested');
      assert.strictEqual(inst.graphQL.instanceToken.callCount, 1, 'GRAPHQL fetch ok');
    });

    // it('should fetch a token using GraphQL with the appropriate option set', async () => {
    //   const inst = instanceFactory();
    //   inst.useGraphQL = true;
    //   const token = await inst.fetchToken();
    //   assert.strictEqual(inst.REST.instanceToken.callCount, 0, 'REST fetch ok');
    //   assert.strictEqual(token.api, 'graphQL', 'token is graphQL based');
    //   assert.strictEqual(inst.graphQL.instanceToken.callCount, 1, 'no token requested');
    // });
  });
});
