// package: epi2me.samples
// file: samples.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "grpc";
import * as samples_pb from "./samples_pb";

interface ISamplesService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    samples: ISamplesService_ISamples;
}

interface ISamplesService_ISamples extends grpc.MethodDefinition<samples_pb.SamplesRequest, samples_pb.ExperimentMap> {
    path: string; // "/epi2me.samples.Samples/Samples"
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<samples_pb.SamplesRequest>;
    requestDeserialize: grpc.deserialize<samples_pb.SamplesRequest>;
    responseSerialize: grpc.serialize<samples_pb.ExperimentMap>;
    responseDeserialize: grpc.deserialize<samples_pb.ExperimentMap>;
}

export const SamplesService: ISamplesService;

export interface ISamplesServer {
    samples: grpc.handleUnaryCall<samples_pb.SamplesRequest, samples_pb.ExperimentMap>;
}

export interface ISamplesClient {
    samples(request: samples_pb.SamplesRequest, callback: (error: grpc.ServiceError | null, response: samples_pb.ExperimentMap) => void): grpc.ClientUnaryCall;
    samples(request: samples_pb.SamplesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: samples_pb.ExperimentMap) => void): grpc.ClientUnaryCall;
    samples(request: samples_pb.SamplesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: samples_pb.ExperimentMap) => void): grpc.ClientUnaryCall;
}

export class SamplesClient extends grpc.Client implements ISamplesClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public samples(request: samples_pb.SamplesRequest, callback: (error: grpc.ServiceError | null, response: samples_pb.ExperimentMap) => void): grpc.ClientUnaryCall;
    public samples(request: samples_pb.SamplesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: samples_pb.ExperimentMap) => void): grpc.ClientUnaryCall;
    public samples(request: samples_pb.SamplesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: samples_pb.ExperimentMap) => void): grpc.ClientUnaryCall;
}
