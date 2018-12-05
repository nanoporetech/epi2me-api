"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _epi2me = require("./dist/epi2me");

Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function () {
    return _interopRequireDefault(_epi2me).default;
  }
});
Object.defineProperty(exports, "version", {
  enumerable: true,
  get: function () {
    return _epi2me.version;
  }
});
Object.defineProperty(exports, "EPI2ME", {
  enumerable: true,
  get: function () {
    return _epi2me.EPI2ME;
  }
});
Object.defineProperty(exports, "REST", {
  enumerable: true,
  get: function () {
    return _epi2me.REST;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
