import { grpc } from '@improbable-eng/grpc-web';
import { Observable } from 'rxjs';
import { RunningInstancesReply, RunningInstanceStateReply, StopReply } from '../../../protos/workflow_pb';
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
    start$(options: Partial<EPI2ME_OPTIONS> & {
        apikey: string;
        apisecret: string;
        inputFolders: string[];
    }, workflowConfig: GQLWorkflowConfig & {
        computeAccountId: string;
    }): Observable<RunningInstancesReply.AsObject>;
    private stop;
    stopUpload(id: string): Observable<StopReply.AsObject>;
    stopAnalysis(id: string): Observable<StopReply.AsObject>;
    state(id: string): Observable<RunningInstanceStateReply.AsObject>;
}
