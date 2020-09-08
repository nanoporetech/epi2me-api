import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
export declare function createClient(setup: () => typeof fetch): ApolloClient<NormalizedCacheObject>;
