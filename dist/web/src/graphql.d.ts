import { Logger } from './Logger';
import { DocumentNode } from 'graphql';
import { ObjectDict } from './ObjectDict';
import { FetchResult } from 'apollo-link';
import { ApolloQueryResult } from 'apollo-client';
interface GraphQLOptions {
    url?: string;
    log: Logger;
    apikey?: string;
    apisecret?: string;
}
interface GraphQLConfiguration {
    url: string;
    apikey?: string;
    apisecret?: string;
    agent_version: string;
    local: boolean;
    user_agent: string;
    signing: boolean;
}
interface RequestContext {
    apikey?: string;
    apisecret?: string;
    url: string;
    [key: string]: unknown;
}
interface QueryOptions {
    context?: ObjectDict;
    variables?: ObjectDict;
    options?: ObjectDict;
}
export default class GraphQL {
    readonly log: Logger;
    readonly client: import("apollo-client").ApolloClient<import("apollo-cache-inmemory").NormalizedCacheObject>;
    readonly options: GraphQLConfiguration;
    constructor(opts: GraphQLOptions);
    createContext: (contextIn: ObjectDict) => RequestContext;
    query(queryString: ((str: string) => DocumentNode) | string | DocumentNode): (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
    mutate(queryString: string | DocumentNode): (opt: QueryOptions) => Promise<FetchResult>;
    resetCache: () => void;
    workflows: (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
    workflowPages: (requestedPage: number) => Promise<unknown>;
    workflow: (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
    workflowInstances: (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
    workflowInstance: (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
    startWorkflow: (opt: QueryOptions) => Promise<FetchResult>;
    stopWorkflow: (opt: QueryOptions) => Promise<FetchResult>;
    instanceToken: (opt: QueryOptions) => Promise<FetchResult>;
    user: (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
    updateUser: (opt: QueryOptions) => Promise<FetchResult>;
    register: (opt: QueryOptions) => Promise<FetchResult>;
    status: (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
    healthCheck: () => Promise<unknown>;
    regions: (opt?: QueryOptions) => Promise<ApolloQueryResult<unknown>>;
}
export {};
