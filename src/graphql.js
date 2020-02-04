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
    this.log = this.options.log;
    this.client = client;
  }

  createContext = contextIn => {
    // Merge any passed in context with requiredContext
    const { apikey, apisecret, url } = this.options;
    return merge({ apikey, apisecret, url }, contextIn);
  };

  query = queryString => ({ context = {}, variables = {} } = {}) => {
    const requestContext = this.createContext(context);
    let query;
    // This lets us write queries using the gql tags and
    // get the syntax highlighting
    if (typeof queryString === 'string') {
      query = gql`
        ${queryString}
      `;
    } else {
      query = queryString;
    }

    return this.client.query({
      query,
      variables,
      context: requestContext,
    });
  };

  mutate = queryString => ({ context = {}, variables = {} } = {}) => {
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
      context: requestContext,
    });
  };

  workflows = this.query(gql`
    query allWorkflows($page: Int, $isActive: Int) {
      allWorkflows(page: $page, isActive: $isActive) {
        ${PageFragment}
        results {
          ${WorkflowFragment}
        }
      }
    }
  `);

  workflowPages = async requestedPage => {
    let page = requestedPage;
    let data = await this.workflows({ variables: { page } });
    const updatePage = async newPage => {
      page = newPage;
      data = await this.workflows({ variables: { page } });
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
  query allWorkflowInstances($page: Int, $shared: Boolean, $idUser: Int) {
    allWorkflowInstances(page: $page, shared: $shared, idUser: $idUser) {
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
  `);

  // startWorkflow(context = {}, variables = {}) {
  //   const mutation = gql`
  //     mutation startWorkflow(
  //       $idWorkflow: ID!
  //       $computeAccountId: Int!
  //       $storageAccountId: Int
  //       $isConsentedHuman: Int = 0
  //     ) {
  //       startWorkflowInstance(
  //         idWorkflow: $idWorkflow
  //         computeAccountId: $computeAccountId
  //         storageAccountId: $storageAccountId
  //         isConsentedHuman: $isConsentedHuman
  //       ) {
  //         bucket
  //         idUser
  //         idWorkflowInstance
  //         inputqueue
  //         outputqueue
  //         region
  //         keyId
  //         chain
  //       }
  //     }
  //   `;
  //   // return this.client.mutate({
  //   //   mutation,
  //   //   variables,
  //   // });
  //   const requestContext = this.createContext(context);
  //   return this.client.mutate({
  //     mutation,
  //     variables,
  //     context: requestContext,
  //   });
  // }

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
  // async register(code, second, third) {
  //   // Output
  //   //   Creds {
  //   //    apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
  //   //    apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
  //   //    description: 'cramshaw@CRAMSHAW-MAC'
  //   // }

  //   let description;
  //   let cb;

  //   if (second && second instanceof Function) {
  //     cb = second;
  //   } else {
  //     description = second;
  //     cb = third;
  //   }
  //   try {
  //     const data = await utils.post(
  //       'apiaccess',
  //       {
  //         code,
  //         description: description || `${os.userInfo().username}@${os.hostname()}`,
  //       },
  //       this.options,
  //     );
  //     return cb ? cb(null, data) : Promise.resolve(data);
  //   } catch (err) {
  //     return cb ? cb(err) : Promise.reject(err);
  //   }
  // }

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
