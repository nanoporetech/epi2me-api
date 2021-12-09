import assert from 'assert';
import { SinonStub, stub } from 'sinon';
import type { Epi2meCredentials } from '../../src/credentials';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';
import type { GraphQL } from '../../src/graphql';
import type { REST_FS } from '../../src/rest-fs';

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
      instanceToken: stub().resolves({
        accessKeyId: 'KEY::REST',
        secretAccessKey: 'SECRET_KEY::REST',
        sessionToken: 'TOKEN::REST',
        expiration: '',
      }),
    } as unknown as REST_FS;
    API.graphQL = {
      instanceToken: stub().resolves({
        token: {
          accessKeyId: 'KEY::GRAPHQL',
          secretAccessKey: 'SECRET_KEY::GRAPHQL',
          sessionToken: 'TOKEN::GRAPHQL',
          expiration: '',
        },
      }),
    } as unknown as GraphQL;

    return API;
  };

  describe('fetchToken', () => {
    it('should fetch a token using REST by default', async () => {
      const inst = instanceFactory();
      const s3 = inst.sessionedS3();
      await (s3.config.credentials as Epi2meCredentials).refreshPromise();

      assert.strictEqual((inst.REST.instanceToken as SinonStub).callCount, 1, 'REST fetch ok');
      assert.strictEqual((inst.graphQL.instanceToken as SinonStub).callCount, 0, 'no token requested');
    });

    it('should fetch a token using GRAPHQL when configured with useGraphQL', async () => {
      const inst = instanceFactory();
      inst.config.options.useGraphQL = true;
      const s3 = inst.sessionedS3();
      await (s3.config.credentials as Epi2meCredentials).refreshPromise();

      assert.strictEqual((inst.REST.instanceToken as SinonStub).callCount, 0, 'no token requested');
      assert.strictEqual((inst.graphQL.instanceToken as SinonStub).callCount, 1, 'GRAPHQL fetch ok');
    });
  });
});
