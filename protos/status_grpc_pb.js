// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var status_pb = require('./status_pb.js');

function serialize_epi2me_status_AliveReply(arg) {
  if (!(arg instanceof status_pb.AliveReply)) {
    throw new Error('Expected argument of type epi2me.status.AliveReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_status_AliveReply(buffer_arg) {
  return status_pb.AliveReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_status_AliveRequest(arg) {
  if (!(arg instanceof status_pb.AliveRequest)) {
    throw new Error('Expected argument of type epi2me.status.AliveRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_status_AliveRequest(buffer_arg) {
  return status_pb.AliveRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_status_AliveStreamRequest(arg) {
  if (!(arg instanceof status_pb.AliveStreamRequest)) {
    throw new Error('Expected argument of type epi2me.status.AliveStreamRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_status_AliveStreamRequest(buffer_arg) {
  return status_pb.AliveStreamRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


// The status service definition.
var StatusService = exports.StatusService = {
  // Sends a scalar
alive: {
    path: '/epi2me.status.Status/Alive',
    requestStream: false,
    responseStream: false,
    requestType: status_pb.AliveRequest,
    responseType: status_pb.AliveReply,
    requestSerialize: serialize_epi2me_status_AliveRequest,
    requestDeserialize: deserialize_epi2me_status_AliveRequest,
    responseSerialize: serialize_epi2me_status_AliveReply,
    responseDeserialize: deserialize_epi2me_status_AliveReply,
  },
  // Sends multiple scalars
aliveStream: {
    path: '/epi2me.status.Status/AliveStream',
    requestStream: false,
    responseStream: true,
    requestType: status_pb.AliveStreamRequest,
    responseType: status_pb.AliveReply,
    requestSerialize: serialize_epi2me_status_AliveStreamRequest,
    requestDeserialize: deserialize_epi2me_status_AliveStreamRequest,
    responseSerialize: serialize_epi2me_status_AliveReply,
    responseDeserialize: deserialize_epi2me_status_AliveReply,
  },
};

exports.StatusClient = grpc.makeGenericClientConstructor(StatusService);
