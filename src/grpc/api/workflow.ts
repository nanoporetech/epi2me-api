import { WorkflowService } from '../protos/workflow_grpc_pb';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Subject, Observable } from 'rxjs';
import { createGrpcRequest$ } from '../utils';
import { RunningInstancesReply } from '../protos/workflow_pb';
import { map } from 'rxjs/operators';

export class WorkflowApi {
  private readonly _destroySubs$ = new Subject();

  constructor(private readonly _url: string) {}

  public close(): void {
    this._destroySubs$.next();
  }

  public getRunning$(): Observable<RunningInstancesReply.AsObject> {
    const request = new Empty();

    return createGrpcRequest$<Empty, RunningInstancesReply>(this._url, WorkflowService.running, request, true).pipe(
      map((response) => response.toObject()),
    );
  }
}
