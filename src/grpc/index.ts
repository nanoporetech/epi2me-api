import { grpc } from '@improbable-eng/grpc-web';
import { WorkflowApi } from './api/workflow';
import { SampleReaderApi } from './api/samples';

export default class EPI2ME_RPC {
  public workflowApi: WorkflowApi;
  public samplesApi: SampleReaderApi;

  constructor(public url: string, jwt: string, transport?: grpc.TransportFactory) {
    this.workflowApi = new WorkflowApi(url, jwt, transport);
    this.samplesApi = new SampleReaderApi(url, jwt, transport);
  }

  public close(): void {
    this.samplesApi.close();
  }
}
