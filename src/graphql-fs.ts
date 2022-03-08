import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import type { CoreOptions } from './CoreOptions.type';

import { GraphQL } from './graphql';
import { writeCommonHeaders } from './network';
import { signMessage } from './network/signed';
import { createClient } from './gql-client';
import { fetch, Headers } from './network/fetch';
import type { Agent } from 'http';
import type { NodeRequestInit } from './network/RequestOptions.type';

export class GraphQLFS extends GraphQL {
  private proxyAgent?: Agent;

  constructor(opts: Partial<CoreOptions>, proxyAgent?: Agent) {
    super(opts);
    this.proxyAgent = proxyAgent;
    this.client = this.initClient();
  }

  initClient = (): ApolloClient<NormalizedCacheObject> => {
    return createClient(this.log, () => {
      return (uri: RequestInfo, init: RequestInit = {}): Promise<Response> => {
        const headers = writeCommonHeaders({ headers: new Headers(init.headers) });
        const newInit: NodeRequestInit = {
          ...init,
          headers,
          agent: this.proxyAgent,
        };

        const { apikey, apisecret } = this.options;
        if (apikey && apisecret) {
          const createMessage = (headers: string[]): string[] => [...headers, init.body + ''];
          signMessage(headers, createMessage, { apikey, apisecret }, true);
        }

        return fetch(uri, newInit);
      };
    });
  };
}
