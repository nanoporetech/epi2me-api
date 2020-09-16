// package: epi2me.samples
// file: samples.proto

import * as samples_pb from "./samples_pb";
import {grpc} from "@improbable-eng/grpc-web";

type SamplesSamples = {
  readonly methodName: string;
  readonly service: typeof Samples;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof samples_pb.SamplesRequest;
  readonly responseType: typeof samples_pb.ExperimentMap;
};

export class Samples {
  static readonly serviceName: string;
  static readonly Samples: SamplesSamples;
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

export class SamplesClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  samples(
    requestMessage: samples_pb.SamplesRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: samples_pb.ExperimentMap|null) => void
  ): UnaryResponse;
  samples(
    requestMessage: samples_pb.SamplesRequest,
    callback: (error: ServiceError|null, responseMessage: samples_pb.ExperimentMap|null) => void
  ): UnaryResponse;
}

