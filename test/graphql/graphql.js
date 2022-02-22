import assert from 'assert';
import sinon from 'sinon';
import { GraphQL } from '../../src/graphql';
import { Network } from '../../src/network';
import { NoopLogger } from '../../src/Logger';

const makeGQL = (profile) => {
  return new GraphQL({
    log: NoopLogger,
    url: '',
    ...profile,
  });
};

const makeRegisteredGQL = () => {
  const profile = {
    apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
    apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
  };
  return new GraphQL({
    log: NoopLogger,
    url: '',
    ...profile,
  });
};

describe('graphql.constructor MC-7563', () => {
  it('should correct double-slashes', () => {
    const graphqlObj = makeGQL({
      url: 'https://epi2me-test.nanoporetech.com/',
    });
    assert.equal(graphqlObj.options.url, 'https://graphql.epi2me-test.nanoporetech.com');
  });
});

describe('stubbed tests', () => {
  let stubs = [];

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  describe('graphql.convertONTJWT', () => {
    it('signature requires a description', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        access: 'RANDOMJWTLIKESTRINGHERE',
      };
      stubs.push(sinon.stub(Network, 'post').resolves(response));
      assert.rejects(
        async () => await graphqlObj.convertONTJWT({ token_type: 'signature' }, 'RANDOMJWTLIKESTRINGHERE'),
        Error,
        'Description required for signature requests',
      );
    });
    it('all requires a description', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        access: 'RANDOMJWTLIKESTRINGHERE',
      };
      stubs.push(sinon.stub(Network, 'post').resolves(response));
      assert.rejects(
        async () => await graphqlObj.convertONTJWT({ token_type: 'all' }, 'RANDOMJWTLIKESTRINGHERE'),
        Error,
        'Description required for signature requests',
      );
    });
    it('jwt passed to request', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        access: 'METRICHORRANDOMJWTLIKESTRINGHERE',
      };
      const stub = sinon.stub(Network, 'post').resolves(response);
      stubs.push(stub);
      const reqData = { token_type: 'jwt' };
      const JWT_STRING = 'RANDOMJWTLIKESTRINGHERE';
      const res = await graphqlObj.convertONTJWT(JWT_STRING, reqData);
      assert.equal(res.access, response.access);
      const calledArgs = stub.getCall(0).args;
      assert.equal(calledArgs[0], 'convert-ont');
      assert.equal(calledArgs[1], reqData);
      assert.deepEqual(calledArgs[2].headers, { 'X-ONT-JWT': JWT_STRING });
    });
  });

  describe('graphql.workflows', () => {
    it('retrieves workflows', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        data: {
          allWorkflows: [
            {
              idWorkflow: 1,
            },
          ],
        },
      };
      stubs.push(sinon.stub(graphqlObj.client, 'query').resolves(response));
      graphqlObj.workflows().then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.workflows.page2', () => {
    it('retrieves workflows second page', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        data: {
          allWorkflows: [
            {
              idWorkflow: 1,
            },
          ],
        },
      };
      stubs.push(sinon.stub(graphqlObj.client, 'query').resolves(response));
      const variables = {
        page: 2,
      };
      graphqlObj
        .workflows({
          variables,
        })
        .then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.retrieves.workflow', () => {
    it('retrieves single workflow', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        data: {
          workflow: {
            idWorkflow: '49',
          },
        },
      };
      stubs.push(sinon.stub(graphqlObj.client, 'query').resolves(response));
      graphqlObj
        .workflow({
          idWorkflow: '49',
        })
        .then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.workflowInstances', () => {
    it('retrieves workflow instances', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        data: {
          allWorkflows: [
            {
              idWorkflow: 1,
            },
          ],
        },
      };
      stubs.push(sinon.stub(graphqlObj.client, 'query').resolves(response));
      graphqlObj.workflowInstances().then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.retrieves.workflowInstance', () => {
    it('retrieves a single workflow instance', async () => {
      const graphqlObj = makeRegisteredGQL();
      const response = {
        data: {
          idWorkflowInstance: '1',
          outputqueue: null,
          startDate: '2014-03-28T22:58:24+00:00',
          __typename: 'WorkflowInstanceType',
        },
      };
      stubs.push(sinon.stub(graphqlObj.client, 'query').resolves(response));
      await graphqlObj
        .workflowInstance({
          idWorkflowInstance: 121,
        })
        .then((data) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.startWorkflow', () => {
    it('starts a workflow instances', async () => {
      // Input:
      //   idWorkflow:1403,
      //   computeAccountId:1,
      //   storageAccountId:1,
      //   isConsentedHuman:1
      const graphqlObj = makeRegisteredGQL();
      const response = {
        data: {
          startWorkflow: {
            idWorkflowInstance: 1,
          },
        },
      };
      stubs.push(sinon.stub(graphqlObj.client, 'mutate').resolves(response));
      graphqlObj
        .startWorkflow({
          idWorkflow: 1403,
          computeAccountId: 1,
        })
        .then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err.networkError.result));
    });
  });

});

/*
Old GQL Utils unit tests.
Might be useful for reestablishing how signing works
Remove when confident new signing works as required.
*/

// describe('graphql.unittests', () => {
// it('gqlUtils.setHeaders adds correct headers', () => {
//   const req = {
//     headers: {},
//     body: 'gqlQueryHere',
//   };
//   const options = {
//     apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
//     apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
//     signing: true,
//   };
//   // sinon.useFakeTimers();
//   gqlUtils.setHeaders(req, options);
//   assert.deepEqual(Object.keys(req.headers), [
//     'Accept',
//     'Content-Type',
//     'X-EPI2ME-CLIENT',
//     'X-EPI2ME-VERSION',
//     'X-EPI2ME-APIKEY',
//     'X-EPI2ME-SIGNATUREDATE',
//     'X-EPI2ME-SIGNATUREV0',
//   ]);
//   // sinon.restore();
// });
// it('gqlUtils.internal.sign correctly signs a request', () => {
//   const req = {
//     headers: {},
//     body: 'gqlQueryHere',
//   };
//   const options = {
//     apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
//     apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
//     signing: true,
//     user_agent: DEFAULTS.user_agent,
//     agent_version: '2019.8.30-1719',
//   };
//   sinon.useFakeTimers();
//   gqlUtils.setHeaders(req, options);
//   assert.deepEqual(req.headers, {
//     Accept: 'application/json',
//     'Content-Type': 'application/json',
//     'X-EPI2ME-CLIENT': 'EPI2ME API',
//     'X-EPI2ME-VERSION': '2019.8.30-1719',
//     'X-EPI2ME-APIKEY': 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
//     'X-EPI2ME-SIGNATUREDATE': '1970-01-01T00:00:00.000Z',
//     'X-EPI2ME-SIGNATUREV0': 'ffebfac74151ebd7fca9c67bb1974ac623e0ea50',
//   });
//   sinon.restore();
// });
// it('custom fetcher calls setHeaders', () => {
//   const uri = 'https://graphql.epi2me.nanoporetech.com';
//   const fetcher = createCustomFetcher({
//     apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
//     apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
//   });
//   sinon.stub(axios, 'request').resolves({
//     data: {
//       random: 'data',
//     },
//     headers: {},
//   });
//   const setHeadersStub = sinon.stub(gqlUtils, 'setHeaders');
//   fetcher(uri);
//   assert(setHeadersStub.called);
//   sinon.restore();
// });
// });

// Check actual signing works as expected
// Test that keys are deleted from headers by customFetcher
// Test changing a profile
// Test hitting right uri - can be passed in context
