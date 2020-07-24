export default class SessionManager {
    constructor(idWorkflowInstance: any, REST: any, children: any, opts: any, graphQL: any);
    id_workflow_instance: any;
    children: any;
    options: any;
    log: any;
    REST: any;
    graphQL: any;
    session(): Promise<void>;
    sts_expiration: number | undefined;
}
