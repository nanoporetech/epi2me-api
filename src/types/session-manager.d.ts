export default class SessionManager {
    constructor(idWorkflowInstance: any, REST: any, children: any, opts: any);
    id_workflow_instance: any;
    children: any;
    options: any;
    log: any;
    REST: any;
    session(): Promise<void>;
    sts_expiration: number | undefined;
}
