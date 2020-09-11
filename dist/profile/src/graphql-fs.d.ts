import GraphQL from './graphql';
import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import { EPI2ME_OPTIONS } from './epi2me-options';
export declare class GraphQLFS extends GraphQL {
    constructor(opts: EPI2ME_OPTIONS);
    initClient: () => ApolloClient<NormalizedCacheObject>;
}
