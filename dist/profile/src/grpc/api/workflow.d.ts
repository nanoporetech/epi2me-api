import { Observable } from 'rxjs';
import { RunningInstancesReply } from '../../../protos/workflow_pb';
export declare class WorkflowApi {
    private readonly _url;
    private readonly _jwt;
    private readonly _destroySubs$;
    constructor(_url: string, _jwt: string);
    close(): void;
    getRunning$(): Observable<RunningInstancesReply.AsObject>;
}
