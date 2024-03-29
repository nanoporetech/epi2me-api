import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import type { CoreOptions } from './CoreOptions.type';

import { GraphQL } from './graphql';
import { writeCommonHeaders } from './network';
import { signMessage } from './network/signed';
import { createClient } from './gql-client';
import { fetch, Headers } from './network/fetch';

export class GraphQLFS extends GraphQL {
  constructor(opts: Partial<CoreOptions>) {
    super(opts);
    this.client = this.initClient();
  }

  initClient = (): ApolloClient<NormalizedCacheObject> => {
    return createClient(this.log, () => {
      return (uri: RequestInfo, init: RequestInit = {}): Promise<Response> => {
        const newInit = {
          ...init,
          headers: writeCommonHeaders({ headers: new Headers(init.headers) }),
          agent: this.options.proxy,
        };

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
