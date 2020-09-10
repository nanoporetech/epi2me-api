import { grpc } from '@improbable-eng/grpc-web';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import {
  RunningInstancesReply,
  RunningInstanceStateReply,
  StartRequest,
  StopReply,
  WorkflowInstanceByIdRequest,
} from '../../../protos/workflow_pb';
import { Workflow } from '../../../protos/workflow_pb_service';
import { EPI2ME_OPTIONS } from '../../epi2me-options';
import { GQLWorkflowConfig } from '../../factory';
import { asNumber, asString } from '../../runtime-typecast';
import { createGrpcRequest$ } from '../utils';

export class WorkflowApi {
  private readonly _destroySubs$ = new Subject();

  constructor(
    private readonly _url: string,
    private readonly _jwt: string,
    private readonly _transport?: grpc.TransportFactory,
  ) {}

  public close(): void {
    this._destroySubs$.next();
  }

  public getRunning$(): Observable<RunningInstancesReply.AsObject> {
    const request = new Empty();

    return createGrpcRequest$<Empty, RunningInstancesReply>(
      this._url,
      { jwt: this._jwt },
      Workflow.running,
      request,
      true,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }

  public start$(
    options: Partial<EPI2ME_OPTIONS>,
    workflowConfig: GQLWorkflowConfig,
  ): Observable<RunningInstancesReply.AsObject> {
    const request = new StartRequest();

    const { apikey, apisecret, url, inputFolders, outputFolder } = options;

    apikey && request.setApikey(apikey);
    apisecret && request.setApisecret(apisecret);
    url && request.setUrl(url);
    inputFolders && request.setInputfoldersList(inputFolders);
    outputFolder && request.setOutputfolder(outputFolder);

    request.setIdworkflow(asString(workflowConfig.idWorkflow));

    workflowConfig.computeAccountId && request.setComputeaccountid(asString(workflowConfig.computeAccountId));
    workflowConfig.storageAccountId && request.setStorageaccountid(asString(workflowConfig.storageAccountId));
    workflowConfig.isConsentedHuman && request.setIsconsentedhuman(workflowConfig.isConsentedHuman);
    workflowConfig.idDataset && request.setIddataset(asString(workflowConfig.idDataset));
    workflowConfig.storeResults && request.setStoreresults(workflowConfig.storeResults);
    workflowConfig.region && request.setRegion(workflowConfig.region);

    request.setUserdefined(
      Struct.fromJavaScript(
        // TODO: Improve typing
        workflowConfig.userDefined as Record<string, null | number | string | boolean | Array<unknown> | {}>,
      ),
    );
    for (const attr of workflowConfig.instanceAttributes ?? []) {
      const newInstanceAttr = new StartRequest.InstanceAttribute();
      newInstanceAttr.setIdAttribute(asNumber(attr.id_attribute));
      newInstanceAttr.setValue(attr.value);
      request.addInstanceattributes(newInstanceAttr);
    }

    return createGrpcRequest$<Empty, RunningInstancesReply>(
      this._url,
      { jwt: this._jwt },
      Workflow.running,
      request,
      false,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }

  private stop(id: string, service: any): Observable<StopReply.AsObject> {
    const request = new WorkflowInstanceByIdRequest();
    request.setIdworkflowinstance(id);

    return createGrpcRequest$<WorkflowInstanceByIdRequest, StopReply>(
      this._url,
      { jwt: this._jwt },
      service,
      request,
      false,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }

  public stopUpload(id: string): Observable<StopReply.AsObject> {
    return this.stop(id, Workflow.stopUpload);
  }

  public stopAnalysis(id: string): Observable<StopReply.AsObject> {
    return this.stop(id, Workflow.stopUpload);
  }

  public state(id: string): Observable<RunningInstanceStateReply.AsObject> {
    const request = new WorkflowInstanceByIdRequest();
    request.setIdworkflowinstance(id);

    return createGrpcRequest$<WorkflowInstanceByIdRequest, RunningInstanceStateReply>(
      this._url,
      { jwt: this._jwt },
      Workflow.instanceRunningState,
      request,
      true,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }
}
