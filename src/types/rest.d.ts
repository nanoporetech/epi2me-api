export default class REST {
    constructor(options: any);
    options: any;
    log: any;
    cachedResponses: {};
    list(entity: any): Promise<any>;
    read(entity: any, id: any): Promise<any>;
    user(): Promise<any>;
    status(): Promise<any>;
    jwt(): Promise<any>;
    instanceToken(id: any, opts: any): Promise<any>;
    installToken(id: any): Promise<any>;
    attributes(): Promise<any>;
    workflows(): Promise<any>;
    amiImages(): Promise<any>;
    amiImage(first: any, second: any): Promise<any>;
    workflow(first: any, second: any, third: any): Promise<any>;
    startWorkflow(config: any): Promise<any>;
    stopWorkflow(idWorkflowInstance: any): Promise<any>;
    workflowInstances(query: any): Promise<any>;
    workflowInstance(id: any): Promise<any>;
    workflowConfig(id: any): Promise<any>;
    register(code: any, description: any): Promise<any>;
    datasets(queryIn: any): Promise<any>;
    dataset(id: any): Promise<any>;
    fetchContent(url: any): Promise<any>;
}
