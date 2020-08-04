/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import gql from 'graphql-tag';
import { local, signing, url as baseUrl, user_agent as userAgent } from './default_options.json';
import PageFragment from './fragments/PageFragment';
import WorkflowFragment from './fragments/WorkflowFragment';
import WorkflowInstanceFragment from './fragments/WorkflowInstanceFragment';
import client from './gql-client';
import utils from './utils';
import { Logger, NoopLogMethod } from './Logger';
import { DocumentNode } from 'graphql';
import { ObjectDict } from './ObjectDict';
import { FetchResult } from 'apollo-link';
import { ApolloQueryResult } from 'apollo-client';

interface GraphQLOptions {
  url?: string;

  log: Logger;
  apikey?: string;
  apisecret?: string;
}

interface GraphQLConfiguration {
  url: string;
  apikey?: string;
  apisecret?: string;
  agent_version: string;
  local: boolean;
  user_agent: string;
  signing: boolean;
}

interface RequestContext {
  apikey?: string;
  apisecret?: string;
  url: string;
  [key: string]: unknown;
}

interface QueryOptions {
  context?: ObjectDict;
  variables?: ObjectDict;
  options?: ObjectDict;
}

export default class GraphQL {
  readonly log: Logger
  readonly client = client
  readonly options: GraphQLConfiguration

  constructor(opts: GraphQLOptions) {
    let url = opts.url ?? baseUrl;
    // https://epi2me-dev.bla => https://graphql.epi2me-dev.bla
    url = url.replace(/:\/\//, '://graphql.');
    // https://epi2me-dev.graphql.bla/ => https://graphql.epi2me-dev.bla
    url = url.replace(/\/$/, '');

    this.options = {
      url,
      agent_version: utils.version,
      local,
      user_agent: userAgent,
      signing,
      apikey: opts.apikey,
      apisecret: opts.apisecret
      // ...opts
    };
    this.log = opts.log;
  }

  createContext = (contextIn: ObjectDict): RequestContext => {
    // Merge any passed in context with requiredContext
    const { apikey, apisecret } = this.options;

    return {
      apikey,
      apisecret,
      url: this.options.url,
      ...contextIn,
    }
  };

  query(queryString: ((str: string) => DocumentNode) | string | DocumentNode) {
    return (opt: QueryOptions = {}): Promise<ApolloQueryResult<unknown>> => {
      const context = opt.context ?? {};
      const variables = opt.variables ?? {};
      const options = opt.options ?? {};
      const requestContext = this.createContext(context);
      let query: DocumentNode;
      // This lets us write queries using the gql tags and
      // get the syntax highlighting
      if (typeof queryString === 'string') {
        query = gql`
          ${queryString}
        `;
      } else if (typeof queryString === 'function') {
        query = gql`
          ${queryString(PageFragment)}
        `;
      } else {
        query = queryString;
      }

      return this.client.query({
        query,
        variables,
        ...options,
        context: requestContext,
      });
    }
  }

  mutate(queryString: string | DocumentNode): (opt: QueryOptions) => Promise<FetchResult> {
    return (opt: QueryOptions = {}): Promise<FetchResult> => {
      const context = opt.context ?? {};
      const variables = opt.variables ?? {};
      const options = opt.options ?? {};
      const requestContext = this.createContext(context);
      let mutation;
      if (typeof queryString === 'string') {
        mutation = gql`
          ${queryString}
        `;
      } else {
        mutation = queryString;
      }
      return this.client.mutate({
        mutation,
        variables,
        ...options,
        context: requestContext,
      });
    }
  }

  resetCache = (): void => {
    this.client.resetStore();
  };

  workflows = this.query(gql`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${PageFragment}
        results {
          ${WorkflowFragment}
        }
      }
    }
  `);

  workflowPages = async (requestedPage: number): Promise<unknown> => {
    let page: number = requestedPage;
    let data = await this.workflows({
      variables: {
        page,
      },
    });
    const updatePage = async (newPage: number): Promise<unknown> => {
      page = newPage;
      data = await this.workflows({
        variables: {
          page,
        },
      });
      return data;
    };
    return {
      data,
      next: (): Promise<unknown> => updatePage(page + 1),
      previous: (): Promise<unknown> => updatePage(page - 1),
      first: (): Promise<unknown> => updatePage(1),
      last: (): Promise<unknown> => updatePage(0),
    };
  };

  workflow = this.query(gql`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${WorkflowFragment}
      }
    }
   `);

  workflowInstances = this.query(gql`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${PageFragment}
      results {
        ${WorkflowInstanceFragment}
      }
    }
  }
   `);

  workflowInstance = this.query(gql`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${WorkflowInstanceFragment}
        }
      }
   `);

  startWorkflow = this.mutate(gql`
    mutation startWorkflow(
      $idWorkflow: ID!
      $computeAccountId: ID!
      $storageAccountId: ID
      $isConsentedHuman: Boolean = false
      $idDataset: ID
      $storeResults: Boolean = false
      $userDefined: GenericScalar
      $instanceAttributes: [GenericScalar]
      $region: String
    ) {
      startData: startWorkflowInstance(
        idWorkflow: $idWorkflow
        computeAccountId: $computeAccountId
        storageAccountId: $storageAccountId
        isConsentedHuman: $isConsentedHuman
        idDataset: $idDataset
        storeResults: $storeResults
        userDefined: $userDefined
        instanceAttributes: $instanceAttributes
        region: $region
      ) {
        bucket
        idUser
        remoteAddr
        instance {
          idWorkflowInstance
          chain
          keyId
          outputqueue
          mappedTelemetry
          workflowImage {
            inputqueue
            workflow {
              idWorkflow
            }
            region {
              name
            }
          }
        }
      }
    }
  `);

  stopWorkflow = this.mutate(gql`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `);

  instanceToken = this.mutate(gql`
    mutation getInstanceToken($idWorkflowInstance: ID!) {
      token: getInstanceToken(idWorkflowInstance: $idWorkflowInstance) {
        id_workflow_instance: idWorkflowInstance
        accessKeyId
        secretAccessKey
        sessionToken
        expiration
        region
      }
    }
  `);

  // user - me

  user = this.query(gql`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `);

  updateUser = this.mutate(gql`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `);

  // dataset(s)
  // show=show

  register = this.mutate(gql`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `);

  // status
  status = this.query(gql`
    query status {
      status {
        portalVersion
        remoteAddr
        serverTime
        minimumAgent
        dbVersion
      }
    }
  `);

  healthCheck = (): Promise<unknown> => utils.get('/status', { ...this.options, log: { debug: NoopLogMethod } });

  // Regions

  regions = this.query(gql`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `);
}
