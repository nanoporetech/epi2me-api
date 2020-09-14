import type { Logger } from './Logger';
import type { DocumentNode } from 'graphql';
import type { ObjectDict } from './ObjectDict';
import type { ApolloQueryResult, FetchResult, NormalizedCacheObject, ApolloClient } from '@apollo/client/core';
import type { EPI2ME_OPTIONS } from './epi2me-options';
import { Index } from './runtime-typecast';
import { ResponseWorkflowInstance, ResponseAllWorkflowInstances, ResponseStartWorkflow, ResponseWorkflow, ResponseAllWorkflows, ResponseStopWorkflowInstance, ResponseGetInstanceToken, ResponseUser, ResponseRegisterToken, ResponseUpdateUser, ResponseStatus, ResponseRegions } from './graphql-types';
export interface GraphQLConfiguration {
    url: string;
    base_url: string;
    apikey?: string;
    apisecret?: string;
    agent_version: string;
    jwt?: string;
    local: boolean;
    user_agent: string;
    signing: boolean;
}
export interface RequestContext {
    apikey?: string;
    apisecret?: string;
    url: string;
    [key: string]: unknown;
}
export interface QueryOptions<Var = ObjectDict, Ctx = ObjectDict, Opt = ObjectDict> {
    context?: Ctx;
    variables?: Var;
    options?: Opt;
}
export declare type AsyncAQR<T = unknown> = Promise<ApolloQueryResult<T>>;
export declare class GraphQL {
    readonly log: Logger;
    readonly options: GraphQLConfiguration;
    client: ApolloClient<NormalizedCacheObject>;
    static NETWORK_ONLY: string;
    static CACHE_FIRST: string;
    static CACHE_AND_NETWORK: string;
    static CACHE_ONLY: string;
    static NO_CACHE: string;
    constructor(opts: Partial<EPI2ME_OPTIONS>);
    initClient: () => ApolloClient<NormalizedCacheObject>;
    createContext: (contextIn: ObjectDict) => RequestContext;
    query<T = unknown, Var extends {} = {}>(queryString: ((str: string) => DocumentNode) | string | DocumentNode): (opt?: QueryOptions<Var>) => AsyncAQR<T>;
    mutate<T = unknown, Var extends {} = {}>(queryString: string | DocumentNode): (opt?: QueryOptions<Var>) => Promise<FetchResult<T>>;
    resetCache: () => void;
    workflows: (opt?: QueryOptions<{
        isActive?: number | undefined;
        page?: number | undefined;
        pageSize?: number | undefined;
        orderBy?: string | undefined;
        region?: string | undefined;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<ResponseAllWorkflows>;
    workflowPages: (requestedPage: number) => Promise<{
        data: ApolloQueryResult<ResponseAllWorkflows>;
        next(): AsyncAQR<ResponseAllWorkflows>;
        previous(): AsyncAQR<ResponseAllWorkflows>;
        first(): AsyncAQR<ResponseAllWorkflows>;
        last(): AsyncAQR<ResponseAllWorkflows>;
    }>;
    workflow: (opt?: QueryOptions<{
        idWorkflow: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<ResponseWorkflow>;
    workflowInstances: (opt?: QueryOptions<{
        idUser?: number | undefined;
        shared?: boolean | undefined;
        page?: number | undefined;
        pageSize?: number | undefined;
        orderBy?: string | undefined;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<ResponseAllWorkflowInstances>;
    workflowInstance: (opt?: QueryOptions<{
        idWorkflowInstance: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<ResponseWorkflowInstance>;
    startWorkflow: (opt?: QueryOptions<{
        idWorkflow: Index;
        computeAccountId: Index;
        storageAccountId?: string | number | undefined;
        isConsentedHuman?: boolean | undefined;
        idDataset?: string | number | undefined;
        storeResults?: boolean | undefined;
        region?: string | undefined;
        userDefined?: Record<string, Record<string, unknown> | undefined> | undefined;
        instanceAttributes?: {
            id_attribute: Index;
            value: string;
        }[] | undefined;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<ResponseStartWorkflow, Record<string, any>, Record<string, any>>>;
    stopWorkflow: (opt?: QueryOptions<{
        idWorkflowInstance: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<ResponseStopWorkflowInstance, Record<string, any>, Record<string, any>>>;
    instanceToken: (opt?: QueryOptions<{
        idWorkflowInstance: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<ResponseGetInstanceToken, Record<string, any>, Record<string, any>>>;
    user: (opt?: QueryOptions<{}, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<ResponseUser>;
    updateUser: (opt?: QueryOptions<{
        idRegionPreferred: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<ResponseUpdateUser, Record<string, any>, Record<string, any>>>;
    register: (opt?: QueryOptions<{
        code: string;
        description?: string | undefined;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<ResponseRegisterToken, Record<string, any>, Record<string, any>>>;
    convertONTJWT(JWT: string, requestData?: {
        token_type: 'jwt' | 'signature' | 'all';
        description?: 'string';
    }): Promise<{
        apikey?: string;
        apisecret?: string;
        description?: string;
        access?: string;
    }>;
    status: (opt?: QueryOptions<{}, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<ResponseStatus>;
    healthCheck(): Promise<{
        status: boolean;
    }>;
    regions: (opt?: QueryOptions<{}, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<ResponseRegions>;
}
export default GraphQL;
