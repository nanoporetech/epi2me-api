import { grpc } from '@improbable-eng/grpc-web';
import { Workflow } from '../../../protos/workflow_pb_service';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { Subject, Observable } from 'rxjs';
import { createGrpcRequest$ } from '../utils';
import { RunningInstancesReply, StartRequest } from '../../../protos/workflow_pb';
import { map, takeUntil } from 'rxjs/operators';
import { EPI2ME_OPTIONS } from '../../epi2me-options';
import { asNumber, asString } from '../../runtime-typecast';
import { GQLWorkflowConfig } from '../../factory';

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

    options.apikey && request.setApikey(options.apikey);
    options.apisecret && request.setApisecret(options.apisecret);
    options.url && request.setUrl(options.url);
    options.inputFolders && request.setInputfoldersList(options.inputFolders);
    options.outputFolder && request.setOutputfolder(options.outputFolder);
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
      true,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }
}
