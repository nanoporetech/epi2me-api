import type { Logger } from './Logger';
import type { DocumentNode } from 'graphql';
import type { ObjectDict } from './ObjectDict';
import type { FetchResult } from 'apollo-link';
import type { ApolloQueryResult } from 'apollo-client';
import type { EPI2ME_OPTIONS } from './epi2me-options';
import { Index } from './runtime-typecast';
import { PaginatedWorkflowType, WorkflowType, PaginatedWorkflowInstanceType, WorkflowInstanceType, WorkflowInstanceMutation, StopWorkflowInstanceMutation, InstanceTokenMutation, UserObjectType, UpdateUserMutation, RegisterTokenMutation, StatusType, RegionType } from './graphql-types';
export interface GraphQLConfiguration {
    url: string;
    apikey?: string;
    apisecret?: string;
    agent_version: string;
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
    readonly client: import("apollo-client").ApolloClient<import("apollo-cache-inmemory").NormalizedCacheObject>;
    readonly options: GraphQLConfiguration;
    constructor(opts: EPI2ME_OPTIONS);
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
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<{
        allWorkflows: PaginatedWorkflowType;
    }>;
    workflowPages: (requestedPage: number) => Promise<{
        data: ApolloQueryResult<{
            allWorkflows: PaginatedWorkflowType;
        }>;
        next(): AsyncAQR<{
            allWorkflows: PaginatedWorkflowType;
        }>;
        previous(): AsyncAQR<{
            allWorkflows: PaginatedWorkflowType;
        }>;
        first(): AsyncAQR<{
            allWorkflows: PaginatedWorkflowType;
        }>;
        last(): AsyncAQR<{
            allWorkflows: PaginatedWorkflowType;
        }>;
    }>;
    workflow: (opt?: QueryOptions<{
        idWorkflow: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<{
        workflow: WorkflowType;
    }>;
    workflowInstances: (opt?: QueryOptions<{
        idUser?: number | undefined;
        shared?: boolean | undefined;
        page?: number | undefined;
        pageSize?: number | undefined;
        orderBy?: string | undefined;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<{
        allWorkflowInstances: PaginatedWorkflowInstanceType;
    }>;
    workflowInstance: (opt?: QueryOptions<{
        idWorkflowInstance: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<{
        workflowInstance: WorkflowInstanceType;
    }>;
    startWorkflow: (opt?: QueryOptions<{
        idWorkflow: Index;
        computeAccountId: Index;
        storageAccountId?: string | number | undefined;
        isConsentedHuman?: boolean | undefined;
        idDataset?: string | number | undefined;
        storeResults?: boolean | undefined;
        region?: string | undefined;
        userDefined?: {
            [componentId: string]: {
                [paramOverride: string]: unknown;
            };
        } | undefined;
        instanceAttributes?: {
            id_attribute: string;
            value: string;
        }[] | undefined;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<{
        startData: WorkflowInstanceMutation;
    }, Record<string, any>, Record<string, any>>>;
    stopWorkflow: (opt?: QueryOptions<{
        idWorkflowInstance: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<{
        stopData: StopWorkflowInstanceMutation;
    }, Record<string, any>, Record<string, any>>>;
    instanceToken: (opt?: QueryOptions<{
        idWorkflowInstance: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<{
        token: InstanceTokenMutation;
    }, Record<string, any>, Record<string, any>>>;
    user: (opt?: QueryOptions<{}, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<{
        me: UserObjectType;
    }>;
    updateUser: (opt?: QueryOptions<{
        idRegionPreferred: Index;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<{
        updateUser: UpdateUserMutation;
    }, Record<string, any>, Record<string, any>>>;
    register: (opt?: QueryOptions<{
        code: string;
        description?: string | undefined;
    }, Record<string, unknown>, Record<string, unknown>> | undefined) => Promise<FetchResult<{
        registerToken: RegisterTokenMutation;
    }, Record<string, any>, Record<string, any>>>;
    status: (opt?: QueryOptions<{}, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<{
        status: StatusType;
    }>;
    healthCheck(): Promise<{
        status: boolean;
    }>;
    regions: (opt?: QueryOptions<{}, Record<string, unknown>, Record<string, unknown>> | undefined) => AsyncAQR<{
        regions: RegionType[];
    }>;
}
export default GraphQL;
