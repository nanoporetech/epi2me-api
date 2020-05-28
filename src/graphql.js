/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import gql from 'graphql-tag';
import { assign, merge } from 'lodash';
import { local, signing, url as baseUrl, user_agent as userAgent } from './default_options.json';
import PageFragment from './fragments/PageFragment';
import WorkflowFragment from './fragments/WorkflowFragment';
import WorkflowInstanceFragment from './fragments/WorkflowInstanceFragment';
import client from './gql-client';
import utils from './utils';

export default class GraphQL {
  constructor(opts) {
    this.options = assign(
      {
        agent_version: utils.version,
        local,
        url: baseUrl,
        user_agent: userAgent,
        signing,
      },
      opts,
    );

    this.options.url = this.options.url.replace(/:\/\//, '://graphql.'); // https://epi2me-dev.bla => https://graphql.epi2me-dev.bla
    this.options.url = this.options.url.replace(/\/$/, ''); // https://epi2me-dev.graphql.bla/ => https://graphql.epi2me-dev.bla
    this.log = this.options.log;
    this.client = client;
  }

  createContext = contextIn => {
    // Merge any passed in context with requiredContext
    const { apikey, apisecret, url } = this.options;
    return merge(
      {
        apikey,
        apisecret,
        url,
      },
      contextIn,
    );
  };

  query = queryString => ({ context = {}, variables = {}, options = {} } = {}) => {
    const requestContext = this.createContext(context);
    let query;
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
  };

  mutate = queryString => ({ context = {}, variables = {}, options = {} } = {}) => {
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
  };

  resetCache = () => {
    this.client.resetStore();
  };

  workflows = this.query(gql`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy) {
        ${PageFragment}
        results {
          ${WorkflowFragment}
        }
      }
    }
  `);

  workflowPages = async requestedPage => {
    let page = requestedPage;
    let data = await this.workflows({
      variables: {
        page,
      },
    });
    const updatePage = async newPage => {
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
      next: () => updatePage(page + 1),
      previous: () => updatePage(page - 1),
      first: () => updatePage(1),
      last: () => updatePage(0),
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
}
