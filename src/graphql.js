/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import os from 'os';
import { assign } from 'lodash';
import gql from 'graphql-tag';
import utils from './utils';
import { local, url as baseURL, user_agent as userAgent, signing } from './default_options.json';
import client from './gql-client';
import PageFragment from './fragments/PageFragment';
import WorkflowFragment from './fragments/WorkflowFragment';
import WorkflowInstanceFragment from './fragments/WorkflowInstanceFragment';

export default class GraphQL {
  constructor(options) {
    // {log, ...options}) {
    this.options = assign(
      {
        agent_version: utils.version,
        local,
        url: baseURL,
        user_agent: userAgent,
        signing,
      },
      options,
    );

    this.log = this.options.log;
    this.client = client;
  }

  workflows(variables) {
    const query = gql`
      query allWorkflows($page: Int) {
        allWorkflows(page: $page) {
          ${PageFragment}
          results {
            ${WorkflowFragment}
          }
        }
      }
    `;
    return this.client.query({ query, variables });
  }

  workflow(variables) {
    const query = gql`
      query workflow($idWorkflow: ID!) {
        workflow(idWorkflow: $idWorkflow) {
          ${WorkflowFragment}
        }
      }
    `;
    return this.client.query({ query, variables });
  }

  workflowInstances(variables) {
    const query = gql`
      query allWorkflowInstances($page: Int) {
        allWorkflowInstances(page: $page) {
          ${PageFragment}
          results {
            ${WorkflowInstanceFragment}
          }
        }
      }
    `;
    return this.client.query({ query, variables });
  }

  workflowInstance(variables) {
    const query = gql`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${WorkflowInstanceFragment}
        }
      }
    `;
    return this.client.query({ query, variables });
  }

  startWorkflow(variables) {
    const mutation = gql`
      mutation startWorkflow(
        $idWorkflow: ID!
        $computeAccountId: Int!
        $storageAccountId: Int
        $isConsentedHuman: Int = 0
      ) {
        startWorkflowInstance(
          idWorkflow: $idWorkflow
          computeAccountId: $computeAccountId
          storageAccountId: $storageAccountId
          isConsentedHuman: $isConsentedHuman
        ) {
          bucket
          idUser
          idWorkflowInstance
          inputqueue
          outputqueue
          region
          keyId
          chain
        }
      }
    `;
    return this.client.mutate({ mutation, variables });
  }

  // dataset(s)
  // show=show

  // user - me

  async register(code, second, third) {
    // Output
    //   Creds {
    //    apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
    //    apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
    //    description: 'cramshaw@CRAMSHAW-MAC'
    // }

    let description;
    let cb;

    if (second && second instanceof Function) {
      cb = second;
    } else {
      description = second;
      cb = third;
    }
    try {
      const data = await utils.post(
        'apiaccess',
        { code, description: description || `${os.userInfo().username}@${os.hostname()}` },
        this.options,
      );
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  // status

  // amiImage(s)

  // async registerMutation(code, second, third) {
  // Still in place but unused
  //   const mutation = gql`
  //     mutation($code: String!, $description: String) {
  //       registerToken(code: $code, description: $description) {
  //         apikey
  //         apisecret
  //         description
  //       }
  //     }
  //   `;
  //   let description;
  //   let cb;

  //   if (second && second instanceof Function) {
  //     cb = second;
  //   } else {
  //     description = second;
  //     cb = third;
  //   }

  //   return this.client
  //     .mutate({
  //       mutation,
  //       variables: { code, description: description || `${os.userInfo().username}@${os.hostname()}` },
  //     })
  //     .then(({ data: { registerToken } }) => (cb ? cb(null, registerToken) : Promise.resolve(registerToken)))
  //     .catch(err => {
  //       console.log(err.message); // GraphQL response errors
  //       return cb ? cb(err) : Promise.reject(err);
  //     });
  // }
}
