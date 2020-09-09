import { grpc } from '@improbable-eng/grpc-web';
import { Observable } from 'rxjs';
import { RunningInstancesReply } from '../../../protos/workflow_pb';
import { EPI2ME_OPTIONS } from '../../epi2me-options';
import { GQLWorkflowConfig } from '../../factory';
export declare class WorkflowApi {
    private readonly _url;
    private readonly _jwt;
    private readonly _transport?;
    private readonly _destroySubs$;
    constructor(_url: string, _jwt: string, _transport?: grpc.TransportFactory | undefined);
    close(): void;
    getRunning$(): Observable<RunningInstancesReply.AsObject>;
    start$(options: Partial<EPI2ME_OPTIONS>, workflowConfig: GQLWorkflowConfig): Observable<RunningInstancesReply.AsObject>;
}
