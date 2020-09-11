// package: epi2me.samples
// file: samples.proto

var samples_pb = require("./samples_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var Samples = (function () {
  function Samples() {}
  Samples.serviceName = "epi2me.samples.Samples";
  return Samples;
}());

Samples.Samples = {
  methodName: "Samples",
  service: Samples,
  requestStream: false,
  responseStream: false,
  requestType: samples_pb.SamplesRequest,
  responseType: samples_pb.ExperimentMap
};

exports.Samples = Samples;

function SamplesClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

SamplesClient.prototype.samples = function samples(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Samples.Samples, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

exports.SamplesClient = SamplesClient;

