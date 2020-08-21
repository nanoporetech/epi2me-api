import {
  ApolloClient,
  ApolloLink,
  execute,
  createHttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client/core';
import { resolve } from 'url';

export function createClient(
  setup: (ctx: Record<string, string>) => typeof fetch,
): ApolloClient<NormalizedCacheObject> {
  const link = new ApolloLink((operation) => {
    const ctx = operation.getContext();
    const fetcher = setup(ctx);
    const httpLink = createHttpLink({
      uri: resolve(ctx.url, '/graphql'),
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
