import {
  ApolloClient,
  ApolloLink,
  execute,
  from,
  createHttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client/core';

import { onError } from '@apollo/client/link/error';
import type { Logger } from './Logger.type';

export function createClient(logger: Logger, setup: () => typeof fetch): ApolloClient<NormalizedCacheObject> {
  const link = new ApolloLink((operation) => {
    const fetcher = setup();
    const { url } = operation.getContext();
    const httpLink = createHttpLink({
      // uri: resolve(url, '/graphql'),
      uri: new URL('/graphql', url).toString(),
      fetch: fetcher,
    });
    const errorLink = onError(({ graphQLErrors }) => {
      graphQLErrors?.map(({ message, extensions }) => {
        switch (extensions?.code) {
          case 'UNAUTHENTICATED': {
            if (message.startsWith('Timestamp validation failed')) {
              logger.critical('CLOCK_OFFSET', message);
            } else {
              logger.critical('UNAUTHENTICATED', message);
            }
          }
        }
      });
    });
    return execute(from([httpLink, errorLink]), operation);
  });

  const cache = new InMemoryCache();

  return new ApolloClient<NormalizedCacheObject>({
    link,
    cache,
  });
}
