import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink, execute } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { resolve } from 'url';
import customFetcher from './fetcher';

const link = new ApolloLink(operation => {
  const { apikey, apisecret, url } = operation.getContext();

  const httpLink = createHttpLink({
    uri: resolve(url, '/graphql'),
    fetch: customFetcher,
    headers: {
      keys: {
        apikey,
        apisecret,
      },
    },
  });
  return execute(httpLink, operation);
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link,
  cache,
});

export default client;
