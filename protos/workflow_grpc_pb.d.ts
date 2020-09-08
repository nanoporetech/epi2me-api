// package: epi2me.workflow
// file: workflow.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "grpc";
import * as workflow_pb from "./workflow_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as google_protobuf_struct_pb from "google-protobuf/google/protobuf/struct_pb";

interface IWorkflowService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    start: IWorkflowService_Istart;
    stopUpload: IWorkflowService_IstopUpload;
    stopAnalysis: IWorkflowService_IstopAnalysis;
    running: IWorkflowService_Irunning;
    instanceRunningState: IWorkflowService_IinstanceRunningState;
}

interface IWorkflowService_Istart extends grpc.MethodDefinition<workflow_pb.StartRequest, workflow_pb.StartReply> {
    path: string; // "/epi2me.workflow.Workflow/start"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<workflow_pb.StartRequest>;
    requestDeserialize: grpc.deserialize<workflow_pb.StartRequest>;
    responseSerialize: grpc.serialize<workflow_pb.StartReply>;
    responseDeserialize: grpc.deserialize<workflow_pb.StartReply>;
}
interface IWorkflowService_IstopUpload extends grpc.MethodDefinition<workflow_pb.WorkflowInstanceByIdRequest, workflow_pb.StopReply> {
    path: string; // "/epi2me.workflow.Workflow/stopUpload"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<workflow_pb.WorkflowInstanceByIdRequest>;
    requestDeserialize: grpc.deserialize<workflow_pb.WorkflowInstanceByIdRequest>;
    responseSerialize: grpc.serialize<workflow_pb.StopReply>;
    responseDeserialize: grpc.deserialize<workflow_pb.StopReply>;
}
interface IWorkflowService_IstopAnalysis extends grpc.MethodDefinition<workflow_pb.WorkflowInstanceByIdRequest, workflow_pb.StopReply> {
    path: string; // "/epi2me.workflow.Workflow/stopAnalysis"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<workflow_pb.WorkflowInstanceByIdRequest>;
    requestDeserialize: grpc.deserialize<workflow_pb.WorkflowInstanceByIdRequest>;
    responseSerialize: grpc.serialize<workflow_pb.StopReply>;
    responseDeserialize: grpc.deserialize<workflow_pb.StopReply>;
}
interface IWorkflowService_Irunning extends grpc.MethodDefinition<google_protobuf_empty_pb.Empty, workflow_pb.RunningInstancesReply> {
    path: string; // "/epi2me.workflow.Workflow/running"
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    requestDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
    responseSerialize: grpc.serialize<workflow_pb.RunningInstancesReply>;
    responseDeserialize: grpc.deserialize<workflow_pb.RunningInstancesReply>;
}
interface IWorkflowService_IinstanceRunningState extends grpc.MethodDefinition<workflow_pb.WorkflowInstanceByIdRequest, workflow_pb.RunningInstanceStateReply> {
    path: string; // "/epi2me.workflow.Workflow/instanceRunningState"
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<workflow_pb.WorkflowInstanceByIdRequest>;
    requestDeserialize: grpc.deserialize<workflow_pb.WorkflowInstanceByIdRequest>;
    responseSerialize: grpc.serialize<workflow_pb.RunningInstanceStateReply>;
    responseDeserialize: grpc.deserialize<workflow_pb.RunningInstanceStateReply>;
}

export const WorkflowService: IWorkflowService;

export interface IWorkflowServer {
    start: grpc.handleUnaryCall<workflow_pb.StartRequest, workflow_pb.StartReply>;
    stopUpload: grpc.handleUnaryCall<workflow_pb.WorkflowInstanceByIdRequest, workflow_pb.StopReply>;
    stopAnalysis: grpc.handleUnaryCall<workflow_pb.WorkflowInstanceByIdRequest, workflow_pb.StopReply>;
    running: grpc.handleServerStreamingCall<google_protobuf_empty_pb.Empty, workflow_pb.RunningInstancesReply>;
    instanceRunningState: grpc.handleServerStreamingCall<workflow_pb.WorkflowInstanceByIdRequest, workflow_pb.RunningInstanceStateReply>;
}

export interface IWorkflowClient {
    start(request: workflow_pb.StartRequest, callback: (error: grpc.ServiceError | null, response: workflow_pb.StartReply) => void): grpc.ClientUnaryCall;
    start(request: workflow_pb.StartRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: workflow_pb.StartReply) => void): grpc.ClientUnaryCall;
    start(request: workflow_pb.StartRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: workflow_pb.StartReply) => void): grpc.ClientUnaryCall;
    stopUpload(request: workflow_pb.WorkflowInstanceByIdRequest, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    stopUpload(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    stopUpload(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    stopAnalysis(request: workflow_pb.WorkflowInstanceByIdRequest, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    stopAnalysis(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    stopAnalysis(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    running(request: google_protobuf_empty_pb.Empty, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstancesReply>;
    running(request: google_protobuf_empty_pb.Empty, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstancesReply>;
    instanceRunningState(request: workflow_pb.WorkflowInstanceByIdRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstanceStateReply>;
    instanceRunningState(request: workflow_pb.WorkflowInstanceByIdRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstanceStateReply>;
}

export class WorkflowClient extends grpc.Client implements IWorkflowClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public start(request: workflow_pb.StartRequest, callback: (error: grpc.ServiceError | null, response: workflow_pb.StartReply) => void): grpc.ClientUnaryCall;
    public start(request: workflow_pb.StartRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: workflow_pb.StartReply) => void): grpc.ClientUnaryCall;
    public start(request: workflow_pb.StartRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: workflow_pb.StartReply) => void): grpc.ClientUnaryCall;
    public stopUpload(request: workflow_pb.WorkflowInstanceByIdRequest, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    public stopUpload(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    public stopUpload(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    public stopAnalysis(request: workflow_pb.WorkflowInstanceByIdRequest, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    public stopAnalysis(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    public stopAnalysis(request: workflow_pb.WorkflowInstanceByIdRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: workflow_pb.StopReply) => void): grpc.ClientUnaryCall;
    public running(request: google_protobuf_empty_pb.Empty, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstancesReply>;
    public running(request: google_protobuf_empty_pb.Empty, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstancesReply>;
    public instanceRunningState(request: workflow_pb.WorkflowInstanceByIdRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstanceStateReply>;
    public instanceRunningState(request: workflow_pb.WorkflowInstanceByIdRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<workflow_pb.RunningInstanceStateReply>;
}
