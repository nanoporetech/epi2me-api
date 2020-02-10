import assert from 'assert';
import axios from 'axios';
import bunyan from 'bunyan';
import gql from 'graphql-tag';
import { merge } from 'lodash';
import sinon from 'sinon';
import DEFAULTS from '../../src/default_options.json';
import customFetcher from '../../src/fetcher';
import client from '../../src/gql-client';
import gqlUtils from '../../src/gql-utils';
import GraphQL from '../../src/graphql';

const makeGQL = profile => {
  const ringbuf = new bunyan.RingBuffer({ limit: 100 });
  const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
  return new GraphQL(merge({ log, profile }));
};

const makeRegisteredGQL = () => {
  const ringbuf = new bunyan.RingBuffer({ limit: 100 });
  const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
  const profile = {
    apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
    apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
  };
  return new GraphQL(merge({ log, profile }));
};

describe('stubbed tests', () => {
  let stubs = [];

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  describe('graphql.register', () => {
    it('retrieves creds', async () => {
      const gql = makeGQL();
      // This needs to be retrieved from /reg first
      const code = '21b1d3';
      const response = {
        apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
        apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
        description: 'user@localmachine',
      };
      stubs.push(sinon.stub(client, 'mutate').resolves(response));
      await gql.register(code, (_, creds) => {
        assert.strictEqual(creds, response);
      });
    });

    it('retrieves creds and sets description', async () => {
      const gql = makeGQL();
      // This needs to be retrieved from /reg first
      const code = '21b1d3';
      const response = {
        apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
        apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
        description: 'description',
      };
      stubs.push(sinon.stub(client, 'mutate').resolves(response));
      await gql.register(code, 'description', (_, creds) => {
        assert.strictEqual(creds, response);
      });
    });
  });

  describe('graphql.workflows', () => {
    it('retrieves workflows', async () => {
      const gql = makeRegisteredGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      gql.workflows().then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.workflows.page2', () => {
    it('retrieves workflows second page', async () => {
      const gql = makeRegisteredGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      const variables = { page: 2 };
      gql.workflows({ variables }).then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.retrieves.workflow', () => {
    it('retrieves single workflow', async () => {
      const gql = makeRegisteredGQL();
      const response = { data: { workflow: { idWorkflow: '49' } } };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      gql.workflow({ idWorkflow: '49' }).then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.workflowInstances', () => {
    it('retrieves workflow instances', async () => {
      const gql = makeRegisteredGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      gql.workflowInstances().then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err));
    });
  });

  describe('graphql.retrieves.workflowInstance', () => {
    it('retrieves a single workflow instance', async () => {
      const gql = makeRegisteredGQL();
      const response = {
        data: {
          idWorkflowInstance: '1',
          outputqueue: null,
          startDate: '2014-03-28T22:58:24+00:00',
          __typename: 'WorkflowInstanceType',
        },
      };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      await gql
        .workflowInstance({ idWorkflowInstance: 121 })
        .then(({ data }) => assert.strictEqual(data, response.data));
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
      const gql = makeRegisteredGQL();
      const response = { data: { startWorkflow: { idWorkflowInstance: 1 } } };
      stubs.push(sinon.stub(client, 'mutate').resolves(response));
      gql
        .startWorkflow({ idWorkflow: 1403, computeAccountId: 1 })
        .then(({ data }) => assert.strictEqual(data, response.data));
      // .catch(err => console.log(err.networkError.result));
    });
  });

  describe('graphql.query', () => {
    it('converts func to gql', async () => {
      const graphql = makeRegisteredGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      const stub = sinon.stub(client, 'query').resolves(response);
      stubs.push(stub);
      graphql.query(
        pageFragment => `query aWorkflow {
        allWorkflows {
          ${pageFragment}
            results {
              config
              idWorkflow
            }
          }
        }
        `,
      )();
      sinon.assert.calledWith(
        stub,
        sinon.match({
          query: gql`
            query aWorkflow {
              allWorkflows {
                page
                pages
                hasNext
                hasPrevious
                totalCount
                results {
                  config
                  idWorkflow
                }
              }
            }
          `,
        }),
      );
    });
    it('converts string to gql', async () => {
      const graphql = makeRegisteredGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      const stub = sinon.stub(client, 'query').resolves(response);
      stubs.push(stub);
      graphql.query(
        `query aWorkflow {
          allWorkflows {
            page
            pages
            hasNext
            hasPrevious
            totalCount
            results {
              config
              idWorkflow
            }
          }
        }
        `,
      )();
      sinon.assert.calledWith(
        stub,
        sinon.match({
          query: gql`
            query aWorkflow {
              allWorkflows {
                page
                pages
                hasNext
                hasPrevious
                totalCount
                results {
                  config
                  idWorkflow
                }
              }
            }
          `,
        }),
      );
    });
    it('leaves gql tagged string in place', async () => {
      const graphql = makeRegisteredGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      const stub = sinon.stub(client, 'query').resolves(response);
      stubs.push(stub);
      graphql.query(
        gql`
          query aWorkflow {
            allWorkflows {
              page
              pages
              hasNext
              hasPrevious
              totalCount
              results {
                config
                idWorkflow
              }
            }
          }
        `,
      )();
      sinon.assert.calledWith(
        stub,
        sinon.match({
          query: gql`
            query aWorkflow {
              allWorkflows {
                page
                pages
                hasNext
                hasPrevious
                totalCount
                results {
                  config
                  idWorkflow
                }
              }
            }
          `,
        }),
      );
    });
  });
});

// For end to end testing
// describe('graphql.e2e', () => {
//   // it('registers', async () => {
//   //   const gql = makeRegisteredGQL();
//   //   // This needs to be retrieved from /reg first
//   //   const code = 'dd0bce';
//   //   await gql.register(code, (_, creds) => {
//   //     console.log(creds);
//   //   });
//   // });

//   it('retrievesWorkflows', async () => {
//     const gql = makeGQL({
//       apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
//       apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
//       uri: 'https://graphql.epi2me-dev.nanoporetech.com',
//       // apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
//       // apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
//       // uri: 'http://epi2me-vm.nanoporetech.com',
//     });
//     // const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
//     // stubs.push(sinon.stub(client, 'query').resolves(response));
//     // const context = { uri: 'https://graphql.epi2me-dev.nanoporetech.com' };
//     // const context = { uri: 'http://epi2me-vm.nanoporetech.com' };
//     gql
//       .workflows(context)
//       .then(({ data }) => console.log(data))
//       .catch(err => console.log(err));
//   });
// });

describe('graphql.unittests', () => {
  it('gqlUtils.setHeaders adds correct headers', () => {
    const req = {
      headers: {},
      body: 'gqlQueryHere',
    };
    const options = {
      apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
      apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
      signing: true,
    };
    // sinon.useFakeTimers();
    gqlUtils.setHeaders(req, options);
    assert.deepEqual(Object.keys(req.headers), [
      'Accept',
      'Content-Type',
      'X-EPI2ME-CLIENT',
      'X-EPI2ME-VERSION',
      'X-EPI2ME-APIKEY',
      'X-EPI2ME-SIGNATUREDATE',
      'X-EPI2ME-SIGNATUREV0',
    ]);
    // sinon.restore();
  });
  it('gqlUtils.internal.sign correctly signs a request', () => {
    const req = {
      headers: {},
      body: 'gqlQueryHere',
    };
    const options = {
      apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
      apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
      signing: true,
      user_agent: DEFAULTS.user_agent,
      agent_version: '2019.8.30-1719',
    };
    sinon.useFakeTimers();
    gqlUtils.setHeaders(req, options);
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-CLIENT': 'EPI2ME API',
      'X-EPI2ME-VERSION': '2019.8.30-1719',
      'X-EPI2ME-APIKEY': 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
      'X-EPI2ME-SIGNATUREDATE': '1970-01-01T00:00:00.000Z',
      'X-EPI2ME-SIGNATUREV0': 'ffebfac74151ebd7fca9c67bb1974ac623e0ea50',
    });
    sinon.restore();
  });
  it('custom fetcher calls setHeaders', () => {
    const uri = 'https://graphql.epi2me.nanoporetech.com';
    const requestOptions = {
      headers: {
        keys: {
          apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
          apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
        },
      },
    };
    sinon.stub(axios, 'request').resolves({ data: { random: 'data' }, headers: {} });
    const setHeadersStub = sinon.stub(gqlUtils, 'setHeaders');
    customFetcher(uri, requestOptions);
    assert(setHeadersStub.called);
    sinon.restore();
  });
});

// Check actual signing works as expected
// Test that keys are deleted from headers by customFetcher
// Test changing a profile
// Test hitting right uri - can be passed in context
