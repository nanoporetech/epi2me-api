export default class REST_FS extends REST {
    constructor(options: any);
    workflows(cb: any): Promise<any>;
    workflowInstances(first: any, second: any): Promise<any>;
    datasets(first: any, second: any): Promise<any>;
    bundleWorkflow(idWorkflow: any, filepath: any, progressCb: any): Promise<any>;
}
import REST from "./rest";
