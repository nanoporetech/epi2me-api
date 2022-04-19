/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import type { Logger } from './Logger.type';
import { asDefined, Dictionary, isString } from 'ts-runtime-typecheck';
import type {
  NormalizedCacheObject,
  ApolloClient,
  TypedDocumentNode,
  QueryOptions,
  MutationOptions,
} from '@apollo/client/core';

import type { GraphQLConfiguration, RequestContext } from './graphql.type';
import type { Configuration } from './Configuration.type';

import { createClient } from './gql-client';
import { invariant } from 'ts-runtime-typecheck';
import { parseCoreOptions } from './parseOptions';
import {
  CreateInstanceTokenDocument,
  GetRegionsDocument,
  GetStatusDocument,
  GetUserDocument,
  GetWorkflowDocument,
  GetWorkflowInstanceDocument,
  ListWorkflowInstanceDocument,
  ListWorkflowsDocument,
  SetRegionDocument,
  StartWorkflowDocument,
  StopWorkflowDocument,
} from './generated/graphql';
import { commonFetch } from './network/common';
import { USER_AGENT } from './UserAgent.constants';

export function getGraphQLEndpoint(base: string): string {
  if (base.includes('://graphql.')) {
    return base;
  }
  return base.replace(/:\/\//, '://graphql.');
}

export class GraphQL {
  readonly log: Logger;
  readonly options: GraphQLConfiguration;
  readonly context: RequestContext;
  client: ApolloClient<NormalizedCacheObject>;

  constructor(opts: Partial<Configuration['options']> = {}) {
    // IS: WARN most of these options aren't used in this file.
    // They are _maybe_ being used `utils.get` but we need to resolve this.
    // CR: I believe local isn't required, the rest will be used for signing on
    // GraphQLFS
    const {
      apikey,
      apisecret,
      jwt,
      log,
      local,
      signing,
      url: originalUrl,
      agent_version: agentVersion,
      proxy,
    } = parseCoreOptions(opts);

    const url = getGraphQLEndpoint(originalUrl);

    this.context = {
      apikey,
      apisecret,
      url,
    };

    this.options = {
      url,
      base_url: url, // New networking wants base_url
      agent_version: agentVersion,
      local,
      signing,
      apikey,
      apisecret,
      jwt,
      proxy,
    };
    this.log = log;

    this.client = this.initClient();
  }

  initClient = (): ApolloClient<NormalizedCacheObject> => {
    return createClient(this.log, () => {
      const client = { name: USER_AGENT, version: this.options.agent_version };
      const { jwt } = this.options;

      invariant(isString(jwt), 'A JWT is required to use this GraphQL client');

      return (uri: RequestInfo, init: RequestInit = {}): Promise<Response> => {
        invariant(isString(uri), ``);

        return commonFetch(
          uri,
          {
            ...init,
            headers: {
              ...(init.headers ?? {}),
              Authorization: `Bearer ${jwt}`,
            },
          },
          { client },
        );
      };
    });
  };

  async query<TVariables extends Dictionary<unknown>, TData>(
    query: TypedDocumentNode<TData, TVariables>,
    variables: TVariables,
    options: Partial<QueryOptions<TVariables, TData>> = {},
  ): Promise<TData> {
    const response = await this.client.query({
      context: this.context,
      query,
      variables,
      ...options,
    });

    return response.data;
  }

  wrapQuery<TVariables extends Dictionary<unknown>, TData>(
    query: TypedDocumentNode<TData, TVariables>,
  ): (variables: TVariables) => Promise<TData> {
    return (variables) => this.query(query, variables);
  }

  async mutate<TVariables, TData>(
    mutation: TypedDocumentNode<TData, TVariables>,
    variables: TVariables,
    options: Partial<MutationOptions<TData, TVariables>> = {},
  ): Promise<TData> {
    const response = await this.client.mutate({
      context: this.context,
      mutation,
      variables,
      ...options,
    });

    return asDefined(response.data);
  }

  wrapMutation<TVariables, TData>(
    mutation: TypedDocumentNode<TData, TVariables>,
  ): (variables: TVariables) => Promise<TData> {
    return (variables) => this.mutate(mutation, variables);
  }

  workflows = this.wrapQuery(ListWorkflowsDocument);
  workflow = this.wrapQuery(GetWorkflowDocument);
  workflowInstance = this.wrapQuery(GetWorkflowInstanceDocument);
  workflowInstances = this.wrapQuery(ListWorkflowInstanceDocument);
  startWorkflow = this.wrapMutation(StartWorkflowDocument);
  stopWorkflow = this.wrapMutation(StopWorkflowDocument);
  instanceToken = this.wrapMutation(CreateInstanceTokenDocument);
  user = this.wrapQuery(GetUserDocument);
  updateUser = this.wrapMutation(SetRegionDocument);
  status = this.wrapQuery(GetStatusDocument);
  regions = this.wrapQuery(GetRegionsDocument);

  async convertONTJWT(
    jwt: string,
    requestData: { token_type: 'jwt' | 'signature' | 'all'; description?: string } = { token_type: 'jwt' },
  ): Promise<{
    apikey?: string;
    apisecret?: string;
    description?: string;
    access?: string;
  }> {
    if (requestData.token_type !== 'jwt' && !requestData.description) {
      throw new Error('Description required for signature requests');
    }

    const client = { name: USER_AGENT, version: this.options.agent_version };

    const response = await commonFetch(
      new URL('convert-ont', this.context.url),
      {
        headers: { 'X-ONT-JWT': jwt },
      },
      { client },
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data: {
      apikey?: string;
      apisecret?: string;
      description?: string;
      access?: string;
    } = await response.json();

    return data;
  }

  async healthCheck(): Promise<{ status: boolean }> {
    const client = { name: USER_AGENT, version: this.options.agent_version };

    const response = await commonFetch(new URL('status', this.context.url), {}, { client });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data: { status: boolean } = await response.json();

    return data;
  }
}
