import { Logger } from './Logger';
import REST from './rest';
import GraphQL from './graphql';
interface SessionManagerOptions {
    log: Logger;
    useGraphQL?: unknown;
    sessionGrace?: string;
    proxy?: string | {
        timeout?: number;
        host?: string;
        port?: number;
    };
    region?: unknown;
}
export default class SessionManager {
    readonly log: Logger;
    readonly REST: REST;
    readonly graphQL: GraphQL;
    readonly options: SessionManagerOptions;
    readonly id_workflow_instance: unknown;
    readonly children: {
        config: {
            update: Function;
        };
    }[];
    sts_expiration?: number;
    constructor(idWorkflowInstance: unknown, REST: REST, children: {
        config: {
            update: Function;
        };
    }[], opts: SessionManagerOptions, graphQL: GraphQL);
    session(): Promise<void>;
}
export {};
