// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var samples_pb = require('./samples_pb.js');

function serialize_epi2me_samples_ExperimentMap(arg) {
  if (!(arg instanceof samples_pb.ExperimentMap)) {
    throw new Error('Expected argument of type epi2me.samples.ExperimentMap');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_samples_ExperimentMap(buffer_arg) {
  return samples_pb.ExperimentMap.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_samples_SamplesRequest(arg) {
  if (!(arg instanceof samples_pb.SamplesRequest)) {
    throw new Error('Expected argument of type epi2me.samples.SamplesRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_samples_SamplesRequest(buffer_arg) {
  return samples_pb.SamplesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var SamplesService = exports.SamplesService = {
  // Sends a nested object
samples: {
    path: '/epi2me.samples.Samples/Samples',
    requestStream: false,
    responseStream: false,
    requestType: samples_pb.SamplesRequest,
    responseType: samples_pb.ExperimentMap,
    requestSerialize: serialize_epi2me_samples_SamplesRequest,
    requestDeserialize: deserialize_epi2me_samples_SamplesRequest,
    responseSerialize: serialize_epi2me_samples_ExperimentMap,
    responseDeserialize: deserialize_epi2me_samples_ExperimentMap,
  },
};

exports.SamplesClient = grpc.makeGenericClientConstructor(SamplesService);
