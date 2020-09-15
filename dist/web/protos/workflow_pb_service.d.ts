// package: epi2me.workflow
// file: workflow.proto

import * as workflow_pb from "./workflow_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import {grpc} from "@improbable-eng/grpc-web";

type Workflowstart = {
  readonly methodName: string;
  readonly service: typeof Workflow;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof workflow_pb.StartRequest;
  readonly responseType: typeof workflow_pb.StartReply;
};

type WorkflowstopUpload = {
  readonly methodName: string;
  readonly service: typeof Workflow;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof workflow_pb.WorkflowInstanceByIdRequest;
  readonly responseType: typeof workflow_pb.StopReply;
};

type WorkflowstopAnalysis = {
  readonly methodName: string;
  readonly service: typeof Workflow;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof workflow_pb.WorkflowInstanceByIdRequest;
  readonly responseType: typeof workflow_pb.StopReply;
};

type Workflowrunning = {
  readonly methodName: string;
  readonly service: typeof Workflow;
  readonly requestStream: false;
  readonly responseStream: true;
  readonly requestType: typeof google_protobuf_empty_pb.Empty;
  readonly responseType: typeof workflow_pb.RunningInstancesReply;
};

type WorkflowinstanceRunningState = {
  readonly methodName: string;
  readonly service: typeof Workflow;
  readonly requestStream: false;
  readonly responseStream: true;
  readonly requestType: typeof workflow_pb.WorkflowInstanceByIdRequest;
  readonly responseType: typeof workflow_pb.RunningInstanceStateReply;
};

export class Workflow {
  static readonly serviceName: string;
  static readonly start: Workflowstart;
  static readonly stopUpload: WorkflowstopUpload;
  static readonly stopAnalysis: WorkflowstopAnalysis;
  static readonly running: Workflowrunning;
  static readonly instanceRunningState: WorkflowinstanceRunningState;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }

interface UnaryResponse {
  cancel(): void;
}
interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: (status?: Status) => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}
interface RequestStream<T> {
  write(message: T): RequestStream<T>;
  end(): void;
  cancel(): void;
  on(type: 'end', handler: (status?: Status) => void): RequestStream<T>;
  on(type: 'status', handler: (status: Status) => void): RequestStream<T>;
}
interface BidirectionalStream<ReqT, ResT> {
  write(message: ReqT): BidirectionalStream<ReqT, ResT>;
  end(): void;
  cancel(): void;
  on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>;
}

export class WorkflowClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  start(
    requestMessage: workflow_pb.StartRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: workflow_pb.StartReply|null) => void
  ): UnaryResponse;
  start(
    requestMessage: workflow_pb.StartRequest,
    callback: (error: ServiceError|null, responseMessage: workflow_pb.StartReply|null) => void
  ): UnaryResponse;
  stopUpload(
    requestMessage: workflow_pb.WorkflowInstanceByIdRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: workflow_pb.StopReply|null) => void
  ): UnaryResponse;
  stopUpload(
    requestMessage: workflow_pb.WorkflowInstanceByIdRequest,
    callback: (error: ServiceError|null, responseMessage: workflow_pb.StopReply|null) => void
  ): UnaryResponse;
  stopAnalysis(
    requestMessage: workflow_pb.WorkflowInstanceByIdRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: workflow_pb.StopReply|null) => void
  ): UnaryResponse;
  stopAnalysis(
    requestMessage: workflow_pb.WorkflowInstanceByIdRequest,
    callback: (error: ServiceError|null, responseMessage: workflow_pb.StopReply|null) => void
  ): UnaryResponse;
  running(requestMessage: google_protobuf_empty_pb.Empty, metadata?: grpc.Metadata): ResponseStream<workflow_pb.RunningInstancesReply>;
  instanceRunningState(requestMessage: workflow_pb.WorkflowInstanceByIdRequest, metadata?: grpc.Metadata): ResponseStream<workflow_pb.RunningInstanceStateReply>;
}

