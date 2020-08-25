import {
  ApolloClient,
  ApolloLink,
  execute,
  createHttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client/core';
import { resolve } from 'url';

export function createClient(setup: () => typeof fetch): ApolloClient<NormalizedCacheObject> {
  const link = new ApolloLink((operation) => {
    const fetcher = setup();
    const { url } = operation.getContext();
    const httpLink = createHttpLink({
      uri: resolve(url, '/graphql'),
      fetch: fetcher,
    });
    return execute(httpLink, operation);
  });

  const cache = new InMemoryCache();

  return new ApolloClient<NormalizedCacheObject>({
    link,
    cache,
  });
}
