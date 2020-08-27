import { WorkflowApi } from './api/workflow';

export class EPI2ME_RPC {
  public workflowApi: WorkflowApi;

  constructor(public url: string) {
    this.workflowApi = new WorkflowApi(url);
  }

  public close(): void {
    this.workflowApi.close();
  }
}
