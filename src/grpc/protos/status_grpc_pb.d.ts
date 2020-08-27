// package: epi2me.status
// file: status.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "grpc";
import * as status_pb from "./status_pb";

interface IStatusService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    alive: IStatusService_IAlive;
    aliveStream: IStatusService_IAliveStream;
}

interface IStatusService_IAlive extends grpc.MethodDefinition<status_pb.AliveRequest, status_pb.AliveReply> {
    path: string; // "/epi2me.status.Status/Alive"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<status_pb.AliveRequest>;
    requestDeserialize: grpc.deserialize<status_pb.AliveRequest>;
    responseSerialize: grpc.serialize<status_pb.AliveReply>;
    responseDeserialize: grpc.deserialize<status_pb.AliveReply>;
}
interface IStatusService_IAliveStream extends grpc.MethodDefinition<status_pb.AliveStreamRequest, status_pb.AliveReply> {
    path: string; // "/epi2me.status.Status/AliveStream"
    requestStream: false;
    responseStream: true;
    requestSerialize: grpc.serialize<status_pb.AliveStreamRequest>;
    requestDeserialize: grpc.deserialize<status_pb.AliveStreamRequest>;
    responseSerialize: grpc.serialize<status_pb.AliveReply>;
    responseDeserialize: grpc.deserialize<status_pb.AliveReply>;
}

export const StatusService: IStatusService;

export interface IStatusServer {
    alive: grpc.handleUnaryCall<status_pb.AliveRequest, status_pb.AliveReply>;
    aliveStream: grpc.handleServerStreamingCall<status_pb.AliveStreamRequest, status_pb.AliveReply>;
}

export interface IStatusClient {
    alive(request: status_pb.AliveRequest, callback: (error: grpc.ServiceError | null, response: status_pb.AliveReply) => void): grpc.ClientUnaryCall;
    alive(request: status_pb.AliveRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: status_pb.AliveReply) => void): grpc.ClientUnaryCall;
    alive(request: status_pb.AliveRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: status_pb.AliveReply) => void): grpc.ClientUnaryCall;
    aliveStream(request: status_pb.AliveStreamRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<status_pb.AliveReply>;
    aliveStream(request: status_pb.AliveStreamRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<status_pb.AliveReply>;
}

export class StatusClient extends grpc.Client implements IStatusClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public alive(request: status_pb.AliveRequest, callback: (error: grpc.ServiceError | null, response: status_pb.AliveReply) => void): grpc.ClientUnaryCall;
    public alive(request: status_pb.AliveRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: status_pb.AliveReply) => void): grpc.ClientUnaryCall;
    public alive(request: status_pb.AliveRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: status_pb.AliveReply) => void): grpc.ClientUnaryCall;
    public aliveStream(request: status_pb.AliveStreamRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<status_pb.AliveReply>;
    public aliveStream(request: status_pb.AliveStreamRequest, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<status_pb.AliveReply>;
}
