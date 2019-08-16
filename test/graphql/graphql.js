import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import { merge } from 'lodash';
import GraphQL from '../../src/graphql';

import client from '../../src/gql-client';
import utils from '../../src/utils';

const makeGQL = () => {
  const ringbuf = new bunyan.RingBuffer({ limit: 100 });
  const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
  return new GraphQL(merge({ log }));
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
      const gql = makeGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      await gql
        .workflows()
        .then(({ data }) => assert.strictEqual(data, response.data))
        .catch(err => console.log(err));
    });
  });

  describe('graphql.workflows.page2', () => {
    it('retrieves workflows', async () => {
      const gql = makeGQL();
      const response = { data: { allWorkflows: [{ idWorkflow: 1 }] } };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      await gql
        .workflows({ page: 2 })
        .then(({ data }) => assert.strictEqual(data, response.data))
        .catch(err => console.log(err));
    });
  });

  describe('graphql.retrieve_workflow', () => {
    it('retrieves workflow', async () => {
      const gql = makeGQL();
      const response = { data: { workflow: { idWorkflow: '49' } } };
      stubs.push(sinon.stub(client, 'query').resolves(response));
      await gql
        .workflow({ idWorkflow: '49' })
        .then(({ data }) => assert.strictEqual(data, response.data))
        .catch(err => console.log(err));
    });
  });
});
