export default class Factory {
    constructor(EPI2ME: any, opts: any);
    EPI2ME: any;
    options: any;
    masterInstance: any;
    log: any;
    REST: any;
    graphQL: any;
    SampleReader: any;
    utils: any;
    version: any;
    runningInstances: {};
    startRun(options: any, workflowConfig: any): Promise<any>;
}
