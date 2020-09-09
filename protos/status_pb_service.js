// package: epi2me.status
// file: status.proto

var status_pb = require("./status_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var Status = (function () {
  function Status() {}
  Status.serviceName = "epi2me.status.Status";
  return Status;
}());

Status.Alive = {
  methodName: "Alive",
  service: Status,
  requestStream: false,
  responseStream: false,
  requestType: status_pb.AliveRequest,
  responseType: status_pb.AliveReply
};

Status.AliveStream = {
  methodName: "AliveStream",
  service: Status,
  requestStream: false,
  responseStream: true,
  requestType: status_pb.AliveStreamRequest,
  responseType: status_pb.AliveReply
};

exports.Status = Status;

function StatusClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

StatusClient.prototype.alive = function alive(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(Status.Alive, {
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

StatusClient.prototype.aliveStream = function aliveStream(requestMessage, metadata) {
  var listeners = {
    data: [],
    end: [],
    status: []
  };
  var client = grpc.invoke(Status.AliveStream, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onMessage: function (responseMessage) {
      listeners.data.forEach(function (handler) {
        handler(responseMessage);
      });
    },
    onEnd: function (status, statusMessage, trailers) {
      listeners.status.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners.end.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners = null;
    }
  });
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

exports.StatusClient = StatusClient;

