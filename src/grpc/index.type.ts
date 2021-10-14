import type { grpc } from '@improbable-eng/grpc-web';
import type { SamplesGetSamplesResponse } from './api/samples.type';
import type { StatusStatusStreamResponse } from './api/status.type';
import type {
  WorkflowGetRunningResponse,
  WorkflowOptions,
  WorkflowStartResponse,
  WorkflowStateResponse,
  WorkflowStopResponse,
} from './api/workflow.type';
import type { Message, Method, Service, UnaryMethod } from './grpc.type';
import type { RequestContext, ServiceContext, Tokens } from './utils.type';

export type GrpcMessage = Message;
export type GrpcMethod = Method;
export type GrpcUnaryMethod = UnaryMethod;
export type GrpcService = Service;

export type GrpcServiceContext = ServiceContext;
export type GrpcRequestContext = RequestContext;
export type GrpcTokens = Tokens;

export type GrpcWorkflowOptions = WorkflowOptions;

export type GrpcSamplesGetSamples = SamplesGetSamplesResponse;

export type GrpcStatusStatusStream = StatusStatusStreamResponse;

export type GrpcWorkflowStart = WorkflowStartResponse;
export type GrpcWorkflowStop = WorkflowStopResponse;
export type GrpcWorkflowState = WorkflowStateResponse;
export type GrpcWorkflowGetRunning = WorkflowGetRunningResponse;

export type GrpcTransport = grpc.TransportFactory;
