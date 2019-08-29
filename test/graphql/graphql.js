import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import { merge } from 'lodash';
import GraphQL from '../../src/graphql';

import client from '../../src/gql-client';
import utils from '../../src/utils';

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
      stubs.push(sinon.stub(utils, 'post').resolves(response));
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
      stubs.push(sinon.stub(utils, 'post').resolves(response));
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
});

// // For end to end testing
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

// Test signing a request - apollo execute
// Test hitting right uri - can be passed in context
// Test changing a profile
// Test that keys are deleted from headers by customFetcher
