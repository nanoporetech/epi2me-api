// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var workflow_pb = require('./workflow_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
var google_protobuf_struct_pb = require('google-protobuf/google/protobuf/struct_pb.js');

function serialize_epi2me_workflow_RunningInstanceStateReply(arg) {
  if (!(arg instanceof workflow_pb.RunningInstanceStateReply)) {
    throw new Error('Expected argument of type epi2me.workflow.RunningInstanceStateReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_workflow_RunningInstanceStateReply(buffer_arg) {
  return workflow_pb.RunningInstanceStateReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_workflow_RunningInstancesReply(arg) {
  if (!(arg instanceof workflow_pb.RunningInstancesReply)) {
    throw new Error('Expected argument of type epi2me.workflow.RunningInstancesReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_workflow_RunningInstancesReply(buffer_arg) {
  return workflow_pb.RunningInstancesReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_workflow_StartReply(arg) {
  if (!(arg instanceof workflow_pb.StartReply)) {
    throw new Error('Expected argument of type epi2me.workflow.StartReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_workflow_StartReply(buffer_arg) {
  return workflow_pb.StartReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_workflow_StartRequest(arg) {
  if (!(arg instanceof workflow_pb.StartRequest)) {
    throw new Error('Expected argument of type epi2me.workflow.StartRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_workflow_StartRequest(buffer_arg) {
  return workflow_pb.StartRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_workflow_StopReply(arg) {
  if (!(arg instanceof workflow_pb.StopReply)) {
    throw new Error('Expected argument of type epi2me.workflow.StopReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_workflow_StopReply(buffer_arg) {
  return workflow_pb.StopReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_epi2me_workflow_WorkflowInstanceByIdRequest(arg) {
  if (!(arg instanceof workflow_pb.WorkflowInstanceByIdRequest)) {
    throw new Error('Expected argument of type epi2me.workflow.WorkflowInstanceByIdRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_epi2me_workflow_WorkflowInstanceByIdRequest(buffer_arg) {
  return workflow_pb.WorkflowInstanceByIdRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}


// The workflow service definition.
var WorkflowService = exports.WorkflowService = {
  // Sends multiple scalars
start: {
    path: '/epi2me.workflow.Workflow/start',
    requestStream: false,
    responseStream: false,
    requestType: workflow_pb.StartRequest,
    responseType: workflow_pb.StartReply,
    requestSerialize: serialize_epi2me_workflow_StartRequest,
    requestDeserialize: deserialize_epi2me_workflow_StartRequest,
    responseSerialize: serialize_epi2me_workflow_StartReply,
    responseDeserialize: deserialize_epi2me_workflow_StartReply,
  },
  stopUpload: {
    path: '/epi2me.workflow.Workflow/stopUpload',
    requestStream: false,
    responseStream: false,
    requestType: workflow_pb.WorkflowInstanceByIdRequest,
    responseType: workflow_pb.StopReply,
    requestSerialize: serialize_epi2me_workflow_WorkflowInstanceByIdRequest,
    requestDeserialize: deserialize_epi2me_workflow_WorkflowInstanceByIdRequest,
    responseSerialize: serialize_epi2me_workflow_StopReply,
    responseDeserialize: deserialize_epi2me_workflow_StopReply,
  },
  stopAnalysis: {
    path: '/epi2me.workflow.Workflow/stopAnalysis',
    requestStream: false,
    responseStream: false,
    requestType: workflow_pb.WorkflowInstanceByIdRequest,
    responseType: workflow_pb.StopReply,
    requestSerialize: serialize_epi2me_workflow_WorkflowInstanceByIdRequest,
    requestDeserialize: deserialize_epi2me_workflow_WorkflowInstanceByIdRequest,
    responseSerialize: serialize_epi2me_workflow_StopReply,
    responseDeserialize: deserialize_epi2me_workflow_StopReply,
  },
  running: {
    path: '/epi2me.workflow.Workflow/running',
    requestStream: false,
    responseStream: true,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: workflow_pb.RunningInstancesReply,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_epi2me_workflow_RunningInstancesReply,
    responseDeserialize: deserialize_epi2me_workflow_RunningInstancesReply,
  },
  instanceRunningState: {
    path: '/epi2me.workflow.Workflow/instanceRunningState',
    requestStream: false,
    responseStream: true,
    requestType: workflow_pb.WorkflowInstanceByIdRequest,
    responseType: workflow_pb.RunningInstanceStateReply,
    requestSerialize: serialize_epi2me_workflow_WorkflowInstanceByIdRequest,
    requestDeserialize: deserialize_epi2me_workflow_WorkflowInstanceByIdRequest,
    responseSerialize: serialize_epi2me_workflow_RunningInstanceStateReply,
    responseDeserialize: deserialize_epi2me_workflow_RunningInstanceStateReply,
  },
};

exports.WorkflowClient = grpc.makeGenericClientConstructor(WorkflowService);
