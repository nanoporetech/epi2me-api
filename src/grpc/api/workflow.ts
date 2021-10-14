import type { GQLWorkflowConfig } from '../../factory.type';
import type { Observable } from 'rxjs';

import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { StartRequest, WorkflowInstanceByIdRequest } from '../../../protos/workflow_pb';
import { Workflow } from '../../../protos/workflow_pb_service';
import { asNumber, asString } from 'ts-runtime-typecheck';
import { createGrpcRequest$ } from '../utils';
import { ServiceBase } from '../ServiceBase';
import type {
  WorkflowGetRunningResponse,
  WorkflowOptions,
  WorkflowStartResponse,
  WorkflowStateResponse,
  WorkflowStopResponse,
} from './workflow.type';

export class WorkflowApi extends ServiceBase {
  private configureWorkflow(options: WorkflowOptions, workflowConfig: GQLWorkflowConfig): StartRequest {
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

    request.setUserdefined(Struct.fromJavaScript(userDefined));

    for (const attr of instanceAttributes) {
      const newInstanceAttr = new StartRequest.InstanceAttribute();
      newInstanceAttr.setIdAttribute(asNumber(attr.id_attribute));
      newInstanceAttr.setValue(attr.value);
      request.addInstanceattributes(newInstanceAttr);
    }
    return request;
  }

  start$(options: WorkflowOptions, workflowConfig: GQLWorkflowConfig): Observable<WorkflowStartResponse> {
    const request = this.configureWorkflow(options, workflowConfig);

    return createGrpcRequest$(this.context, Workflow.start, request);
  }

  stopUpload$(id: string): Observable<WorkflowStopResponse> {
    const request = new WorkflowInstanceByIdRequest();
    request.setIdworkflowinstance(id);

    return createGrpcRequest$(this.context, Workflow.stopUpload, request);
  }

  stopAnalysis$(id: string): Observable<WorkflowStopResponse> {
    const request = new WorkflowInstanceByIdRequest();
    request.setIdworkflowinstance(id);

    return createGrpcRequest$(this.context, Workflow.stopAnalysis, request);
  }

  state$(id: string): Observable<WorkflowStateResponse> {
    const request = new WorkflowInstanceByIdRequest();
    request.setIdworkflowinstance(id);

    return createGrpcRequest$(this.context, Workflow.instanceRunningState, request);
  }

  getRunning$(): Observable<WorkflowGetRunningResponse> {
    const request = new Empty();

    return createGrpcRequest$(this.context, Workflow.running, request);
  }
}
