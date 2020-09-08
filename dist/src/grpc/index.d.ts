import { WorkflowApi } from './api/workflow';
export default class EPI2ME_RPC {
    url: string;
    workflowApi: WorkflowApi;
    constructor(url: string, jwt: string);
    close(): void;
}
