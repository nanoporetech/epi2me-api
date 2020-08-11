/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import gql from 'graphql-tag';
import PageFragment from './fragments/PageFragment';
import WorkflowFragment from './fragments/WorkflowFragment';
import WorkflowInstanceFragment from './fragments/WorkflowInstanceFragment';
import client from './gql-client';
import utils from './utils';
import { NoopLogMethod } from './Logger';

import type { Logger } from './Logger'; 
import type { DocumentNode } from 'graphql';
import type { ObjectDict } from './ObjectDict';
import type { FetchResult } from 'apollo-link';
import type { ApolloQueryResult } from 'apollo-client';
import type { EPI2ME_OPTIONS } from './epi2me-options';
import { asBoolean, Index } from './runtime-typecast';
import { PaginatedWorkflowType, WorkflowType, PaginatedWorkflowInstanceType, WorkflowInstanceType, WorkflowInstanceMutation, StopWorkflowInstanceMutation, InstanceTokenMutation, UserObjectType, UpdateUserMutation, RegisterTokenMutation, StatusType, RegionType } from './graphql-types';

export interface GraphQLConfiguration {
  url: string;
  apikey?: string;
  apisecret?: string;
  agent_version: string;
  local: boolean;
  user_agent: string;
  signing: boolean;
}

export interface RequestContext {
  apikey?: string;
  apisecret?: string;
  url: string;
  [key: string]: unknown;
}

export interface QueryOptions<Var = ObjectDict, Ctx = ObjectDict, Opt = ObjectDict> {
  context?: Ctx;
  variables?: Var;
  options?: Opt;
}

export type AsyncAQR<T = unknown> = Promise<ApolloQueryResult<T>>;
export class GraphQL {
  readonly log: Logger;
  readonly client = client;
  readonly options: GraphQLConfiguration;

  // See: https://www.apollographql.com/docs/react/api/react-apollo/#optionsfetchpolicy
  static NETWORK_ONLY = 'network-only';
  static CACHE_FIRST = 'cache-first';
  static CACHE_AND_NETWORK = 'cache-and-network';
  static CACHE_ONLY = 'cache-only';
  static NO_CACHE = 'no-cache';

  constructor(opts: EPI2ME_OPTIONS) {
    let url = opts.url;
    // https://epi2me-dev.bla => https://graphql.epi2me-dev.bla
    url = url.replace(/:\/\//, '://graphql.');
    // https://epi2me-dev.graphql.bla/ => https://graphql.epi2me-dev.bla
    url = url.replace(/\/$/, '');

    const { apikey, apisecret, log, local, signing } = opts;

    // WARN most of these options aren't used in this file.
    // They are _maybe_ being used `utils.get` but we need to resolve this.
    this.options = {
      url,
      agent_version: opts.agent_version,
      local,
      user_agent: opts.user_agent,
      signing,
      apikey,
      apisecret,
    };
    this.log = log;
  }

  createContext = (contextIn: ObjectDict): RequestContext => {
    // Merge any passed in context with requiredContext
    const { apikey, apisecret, url } = this.options;

    return {
      apikey,
      apisecret,
      url,
      ...contextIn,
    };
  };

  query<T = unknown, Var extends {} = {}>(queryString: ((str: string) => DocumentNode) | string | DocumentNode): (opt?: QueryOptions<Var>) => AsyncAQR<T> {
    return (opt?: QueryOptions<Var>): AsyncAQR<T> => {
      const context = opt?.context ?? {};
      const variables = opt?.variables ?? {};
      const options = opt?.options ?? {};
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

      return this.client.query<T>({
        query,
        variables,
        ...options,
        context: requestContext,
      });
    };
  }

  mutate<T = unknown, Var extends {} = {}>(queryString: string | DocumentNode): (opt?: QueryOptions<Var>) => Promise<FetchResult<T>> {
    return (opt?: QueryOptions<Var>): Promise<FetchResult<T>> => {
      const context = opt?.context ?? {};
      const variables = opt?.variables ?? {};
      const options = opt?.options ?? {};
      const requestContext = this.createContext(context);
      let mutation;
      if (typeof queryString === 'string') {
        mutation = gql`
          ${queryString}
        `;
      } else {
        mutation = queryString;
      }
      return this.client.mutate<T>({
        mutation,
        variables,
        ...options,
        context: requestContext,
      });
    };
  }

  resetCache = (): void => {
    this.client.resetStore();
  };
  
  workflows = this.query<{ allWorkflows: PaginatedWorkflowType}, { isActive?: number; page?: number; pageSize?: number; orderBy?: string; region?: string }>(gql`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${PageFragment}
        results {
          ${WorkflowFragment}
        }
      }
    }
  `);

  workflowPages = async (requestedPage: number): Promise<{
    data: ApolloQueryResult<{ allWorkflows: PaginatedWorkflowType}>;
    next(): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}>;
    previous(): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}>;
    first(): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}>;
    last(): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}>;
  }> => {
    let page: number = requestedPage;
    let data = await this.workflows({
      variables: {
        page,
      },
    });
    const updatePage = async (newPage: number): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}> => {
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
      next: (): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}> => updatePage(page + 1),
      previous: (): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}> => updatePage(page - 1),
      first: (): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}> => updatePage(1),
      last: (): AsyncAQR<{ allWorkflows: PaginatedWorkflowType}> => updatePage(0),
    };
  };

  workflow = this.query<{ workflow: WorkflowType }, { idWorkflow: Index }>(gql`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${WorkflowFragment}
      }
    }
   `);

  workflowInstances = this.query<{ allWorkflowInstances: PaginatedWorkflowInstanceType}, { idUser?: number; shared?: boolean; page?: number; pageSize?: number; orderBy?: string }>(gql`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${PageFragment}
      results {
        ${WorkflowInstanceFragment}
      }
    }
  }
   `);

  workflowInstance = this.query<{ workflowInstance: WorkflowInstanceType }, { idWorkflowInstance: Index }>(gql`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${WorkflowInstanceFragment}
        }
      }
   `);

  startWorkflow = this.mutate<{ startData: WorkflowInstanceMutation }, { idWorkflow: Index; computeAccountId: Index; storageAccountId?: Index; isConsentedHuman?: boolean; idDataset?: Index; storeResults?: boolean; region?: string; userDefined?: { [componentId: string]: { [paramOverride: string]: unknown } }; instanceAttributes?: { id_attribute: string; value: string }[]}>(gql`
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

  stopWorkflow = this.mutate<{ stopData: StopWorkflowInstanceMutation }, { idWorkflowInstance: Index }>(gql`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `);

  instanceToken = this.mutate<{ token: InstanceTokenMutation}, { idWorkflowInstance: Index }>(gql`
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

  user = this.query<{ me: UserObjectType }, {}>(gql`
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

  updateUser = this.mutate<{ updateUser: UpdateUserMutation }, { idRegionPreferred: Index }>(gql`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `);

  // dataset(s)
  // show=show

  register = this.mutate<{ registerToken: RegisterTokenMutation }, { code: string; description?: string }>(gql`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `);

  // status
  status = this.query<{ status: StatusType }, {}>(gql`
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


  async healthCheck (): Promise<{ status: boolean }> {
    const result = await utils.get('/status', { ...this.options, log: { debug: NoopLogMethod } });

    return {
      status: asBoolean(result.status)
    };
  }

  // Regions

  regions = this.query<{ regions: RegionType[] }, {}>(gql`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `);
}

export default GraphQL;