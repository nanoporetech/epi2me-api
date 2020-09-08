import { WorkflowApi } from './api/workflow';

export default class EPI2ME_RPC {
  public workflowApi: WorkflowApi;

  constructor(public url: string, jwt: string) {
    this.workflowApi = new WorkflowApi(url, jwt);
  }

  public close(): void {
    this.workflowApi.close();
  }
}
