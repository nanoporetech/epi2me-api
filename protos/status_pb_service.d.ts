// package: epi2me.status
// file: status.proto

import * as status_pb from "./status_pb";
import {grpc} from "@improbable-eng/grpc-web";

type StatusAlive = {
  readonly methodName: string;
  readonly service: typeof Status;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof status_pb.AliveRequest;
  readonly responseType: typeof status_pb.AliveReply;
};

type StatusAliveStream = {
  readonly methodName: string;
  readonly service: typeof Status;
  readonly requestStream: false;
  readonly responseStream: true;
  readonly requestType: typeof status_pb.AliveStreamRequest;
  readonly responseType: typeof status_pb.AliveReply;
};

export class Status {
  static readonly serviceName: string;
  static readonly Alive: StatusAlive;
  static readonly AliveStream: StatusAliveStream;
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

export class StatusClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  alive(
    requestMessage: status_pb.AliveRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: status_pb.AliveReply|null) => void
  ): UnaryResponse;
  alive(
    requestMessage: status_pb.AliveRequest,
    callback: (error: ServiceError|null, responseMessage: status_pb.AliveReply|null) => void
  ): UnaryResponse;
  aliveStream(requestMessage: status_pb.AliveStreamRequest, metadata?: grpc.Metadata): ResponseStream<status_pb.AliveReply>;
}

