import { grpc } from '@improbable-eng/grpc-web';
import { WorkflowApi } from './api/workflow';
import { SampleReaderApi } from './api/samples';
export default class EPI2ME_RPC {
    url: string;
    workflowApi: WorkflowApi;
    samplesApi: SampleReaderApi;
    constructor(url: string, jwt: string, transport?: grpc.TransportFactory);
    close(): void;
}
