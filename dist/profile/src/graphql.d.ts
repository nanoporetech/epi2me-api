export default class GraphQL {
    constructor(opts: any);
    options: any;
    log: any;
    client: import("apollo-client").ApolloClient<import("apollo-cache-inmemory").NormalizedCacheObject>;
    createContext: (contextIn: any) => any;
    query: (queryString: any) => ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
    mutate: (queryString: any) => ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-link").FetchResult<any, Record<string, any>, Record<string, any>>>;
    resetCache: () => void;
    workflows: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
    workflowPages: (requestedPage: any) => Promise<{
        data: import("apollo-client").ApolloQueryResult<any>;
        next: () => Promise<import("apollo-client").ApolloQueryResult<any>>;
        previous: () => Promise<import("apollo-client").ApolloQueryResult<any>>;
        first: () => Promise<import("apollo-client").ApolloQueryResult<any>>;
        last: () => Promise<import("apollo-client").ApolloQueryResult<any>>;
    }>;
    workflow: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
    workflowInstances: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
    workflowInstance: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
    startWorkflow: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-link").FetchResult<any, Record<string, any>, Record<string, any>>>;
    stopWorkflow: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-link").FetchResult<any, Record<string, any>, Record<string, any>>>;
    instanceToken: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-link").FetchResult<any, Record<string, any>, Record<string, any>>>;
    user: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
    updateUser: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-link").FetchResult<any, Record<string, any>, Record<string, any>>>;
    register: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-link").FetchResult<any, Record<string, any>, Record<string, any>>>;
    status: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
    healthCheck: () => Promise<any>;
    regions: ({ context, variables, options }?: {
        context?: {} | undefined;
        variables?: {} | undefined;
        options?: {} | undefined;
    }) => Promise<import("apollo-client").ApolloQueryResult<any>>;
}
