import { GraphQL } from './graphql';
import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import { writeCommonHeaders } from './network';
import { signMessage } from './network/signed';
import { createClient } from './gql-client';
import fetch, { Headers } from 'cross-fetch';
import { EPI2ME_OPTIONS } from './epi2me-options';

export class GraphQLFS extends GraphQL {
  constructor(opts: EPI2ME_OPTIONS) {
    super(opts);
    this.client = this.initClient();
  }

  initClient = (): ApolloClient<NormalizedCacheObject> => {
    return createClient(() => {
      return (uri: RequestInfo, init: RequestInit = {}): Promise<Response> => {
        const newInit = {
          ...init,
          headers: writeCommonHeaders({ headers: new Headers(init.headers) }),
          agent: null,
        };

        // init.agent = proxy;

        const { apikey, apisecret } = this.options;
        if (apikey && apisecret) {
          const createMessage = (headers: string[]): string[] => [...headers, init.body + ''];
          signMessage(newInit.headers, createMessage, { apikey, apisecret }, true);
        }

        return fetch(uri, newInit);
      };
    });
  };
}
