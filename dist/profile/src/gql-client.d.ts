import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
export declare function createClient(setup: (ctx: Record<string, string>) => typeof fetch): ApolloClient<NormalizedCacheObject>;
