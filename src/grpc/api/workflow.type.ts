import type { EPI2ME_OPTIONS } from '../../epi2me-options.type';
import type {
  RunningInstancesReply,
  RunningInstanceStateReply,
  StartReply,
  StopReply,
} from '../../../protos/workflow_pb';

export interface WorkflowOptions extends Partial<EPI2ME_OPTIONS> {
  apikey: string;
  apisecret: string;
  inputFolders: string[];
}

export type WorkflowStartResponse = StartReply.AsObject;
export type WorkflowStopResponse = StopReply.AsObject;
export type WorkflowStateResponse = RunningInstanceStateReply.AsObject;
export type WorkflowGetRunningResponse = RunningInstancesReply.AsObject;
