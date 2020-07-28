import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink, execute } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { resolve } from 'url';
import { createCustomFetcher, Fetch } from './fetcher';

type NativeFetch = WindowOrWorkerGlobalScope["fetch"];

function convertFetchToNativeFetch(fetcher: Fetch | NativeFetch): NativeFetch {
  // HACK Apollo link incorrectly uses the types for native fetch which does not match with node-fetch.
  // https://github.com/apollographql/apollo-link/issues/513
  // The types are largly compatible, but it doesn't look like they will fix this anytime soon.
  return fetcher as unknown as NativeFetch;
}

const link = new ApolloLink(operation => {
  const {
    apikey,
    apisecret,
    url
  } = operation.getContext();

  const fetcher = createCustomFetcher({ apikey, apisecret });

  const httpLink = createHttpLink({
    uri: resolve(url, '/graphql'),
    // WARN this call is effectively a no-op, but it ensures that fetcher is a compatible type
    // for our unsafe conversion. Inlining it would remove that type check, allowing for bad
    // things like `"whoops" as unknown as NativeFetch`
    fetch: convertFetchToNativeFetch(fetcher),
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
