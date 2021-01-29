import { grpc } from '@improbable-eng/grpc-web';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import {
  RunningInstancesReply,
  RunningInstanceStateReply,
  StartReply,
  StartRequest,
  StopReply,
  WorkflowInstanceByIdRequest,
} from '../../../protos/workflow_pb';
import { Workflow } from '../../../protos/workflow_pb_service';
import { EPI2ME_OPTIONS } from '../../epi2me-options';
import { asNumber, asString } from 'ts-runtime-typecheck';
import type { Dictionary } from 'ts-runtime-typecheck';

import { createGrpcRequest$ } from '../utils';

import type { GQLWorkflowConfig } from '../../factory.type';

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
    options: Partial<EPI2ME_OPTIONS> & { apikey: string; apisecret: string; inputFolders: string[] },
    workflowConfig: GQLWorkflowConfig & { computeAccountId: string },
  ): Observable<StartReply.AsObject> {
    const request = new StartRequest();

    const { apikey, apisecret, url, inputFolders, outputFolder, filetype } = options;

    request.setApikey(apikey);
    request.setApisecret(apisecret);
    request.setInputfoldersList(inputFolders);
    url && request.setUrl(url);
    outputFolder && request.setOutputfolder(outputFolder);
    filetype && request.setFiletypesList(filetype);

    const {
      idWorkflow,
      computeAccountId,
      storageAccountId,
      isConsentedHuman,
      idDataset,
      storeResults,
      region,
      userDefined = {},
      instanceAttributes = [],
    } = workflowConfig;
    request.setIdworkflow(asString(idWorkflow));

    request.setComputeaccountid(asString(computeAccountId));
    storageAccountId && request.setStorageaccountid(asString(storageAccountId));
    isConsentedHuman && request.setIsconsentedhuman(isConsentedHuman);
    idDataset && request.setIddataset(asString(idDataset));
    storeResults && request.setStoreresults(storeResults);
    region && request.setRegion(region);

    request.setUserdefined(
      Struct.fromJavaScript(
        // TODO: Improve typing
        userDefined as Record<string, null | number | string | boolean | Array<unknown> | Dictionary>,
      ),
    );
    for (const attr of instanceAttributes) {
      const newInstanceAttr = new StartRequest.InstanceAttribute();
      newInstanceAttr.setIdAttribute(asNumber(attr.id_attribute));
      newInstanceAttr.setValue(attr.value);
      request.addInstanceattributes(newInstanceAttr);
    }

    return createGrpcRequest$<StartRequest, StartReply>(
      this._url,
      { jwt: this._jwt },
      Workflow.start,
      request,
      false,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }

  private stop$(id: string, service: any): Observable<StopReply.AsObject> {
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

  public stopUpload$(id: string): Observable<StopReply.AsObject> {
    return this.stop$(id, Workflow.stopUpload);
  }

  public stopAnalysis$(id: string): Observable<StopReply.AsObject> {
    return this.stop$(id, Workflow.stopAnalysis);
  }

  public state$(id: string): Observable<RunningInstanceStateReply.AsObject> {
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
