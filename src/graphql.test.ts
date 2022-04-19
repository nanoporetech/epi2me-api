import sinon, { SinonStub } from 'sinon';
import { GraphQL } from './graphql';
import { NoopLogger } from './Logger';
import { expectToThrow } from './NodeError';
import { Response } from './network/fetch';

let stubs: SinonStub[] = [];

beforeEach(() => {
  stubs = [];
});

afterEach(() => {
  stubs.forEach((s) => {
    s.restore();
  });
});

jest.mock('./network/common', () => {
  return {
    commonFetch() {
      return new Response(
        JSON.stringify({
          access: 'RANDOMJWTLIKESTRINGHERE',
        }),
      );
    },
  };
});

const makeGQL = (profile: { apikey?: string; apisecret?: string; url?: string }) =>
  new GraphQL({
    log: NoopLogger,
    url: 'https://example.org',
    ...profile,
  });

const makeRegisteredGQL = () =>
  makeGQL({
    apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
    apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
  });

const stubQuery = (gql: GraphQL, query: string, data: unknown) =>
  sinon.stub(gql.client, 'query').resolves({
    loading: false,
    networkStatus: 7,
    data: {
      [query]: data,
    },
  });

const stubMutate = (gql: GraphQL, mutation: string, data: unknown) =>
  sinon.stub(gql.client, 'mutate').resolves({
    data: {
      [mutation]: data,
    },
  });

describe('constructor', () => {
  it('adds graphql subdomain to endpoint', () => {
    const graphqlObj = makeGQL({
      url: 'https://epi2me-test.nanoporetech.com',
    });
    expect(graphqlObj.options.url).toEqual('https://graphql.epi2me-test.nanoporetech.com');
  });
  it("doesn't add graphql subdomain if already present", () => {
    const graphqlObj = makeGQL({
      url: 'https://graphql.epi2me-test.nanoporetech.com',
    });
    expect(graphqlObj.options.url).toEqual('https://graphql.epi2me-test.nanoporetech.com');
  });
  it('endpoint can contain trailing slash', () => {
    const graphqlObj = makeGQL({
      url: 'https://epi2me-test.nanoporetech.com/',
    });
    expect(graphqlObj.options.url).toEqual('https://graphql.epi2me-test.nanoporetech.com');
  });
});

describe('convertONTJWT', () => {
  it('signature requires a description', async () => {
    const graphqlObj = makeRegisteredGQL();
    await expectToThrow(
      () => graphqlObj.convertONTJWT('RANDOMJWTLIKESTRINGHERE', { token_type: 'signature' }),
      'Description required for signature requests',
    );
  });
  it('all requires a description', async () => {
    const graphqlObj = makeRegisteredGQL();
    await expectToThrow(
      () => graphqlObj.convertONTJWT('RANDOMJWTLIKESTRINGHERE', { token_type: 'all' }),
      'Description required for signature requests',
    );
  });
  it('jwt passed to request', async () => {
    const graphqlObj = makeRegisteredGQL();
    const res = await graphqlObj.convertONTJWT('RANDOMJWTLIKESTRINGHERE', { token_type: 'jwt' });
    expect(res.access).toEqual('RANDOMJWTLIKESTRINGHERE');
  });
});

it('workflows', async () => {
  const graphqlObj = makeRegisteredGQL();
  stubs.push(stubQuery(graphqlObj, 'allWorkflows', [{ idWorkflow: '49' }]));

  const { allWorkflows } = await graphqlObj.workflows({});
  expect(allWorkflows).toEqual([
    {
      idWorkflow: '49',
    },
  ]);
});

it('workflow', async () => {
  const graphqlObj = makeRegisteredGQL();
  stubs.push(stubQuery(graphqlObj, 'workflow', { idWorkflow: '49' }));

  const { workflow } = await graphqlObj.workflow({ workflow: '49' });
  expect(workflow).toEqual({
    idWorkflow: '49',
  });
});

it('workflowInstances', async () => {
  const graphqlObj = makeRegisteredGQL();
  stubs.push(stubQuery(graphqlObj, 'allWorkflowInstances', [{ idWorkflowInstance: '1' }]));

  const { allWorkflowInstances } = await graphqlObj.workflowInstances({});
  expect(allWorkflowInstances).toEqual([
    {
      idWorkflowInstance: '1',
    },
  ]);
});

it('workflowInstance', async () => {
  const graphqlObj = makeRegisteredGQL();
  stubs.push(stubQuery(graphqlObj, 'workflowInstance', { idWorkflowInstance: '1' }));

  const { workflowInstance } = await graphqlObj.workflowInstance({ instance: '1' });
  expect(workflowInstance).toEqual({
    idWorkflowInstance: '1',
  });
});

it('startWorkflow', async () => {
  const graphqlObj = makeRegisteredGQL();
  stubMutate(graphqlObj, 'startData', { idWorkflowInstance: '42' });

  const { startData } = await graphqlObj.startWorkflow({ idWorkflow: '1', computeAccountId: '1' });

  expect(startData).toEqual({
    idWorkflowInstance: '42',
  });
});
