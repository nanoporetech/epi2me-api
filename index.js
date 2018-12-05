"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

const version = exports.version = require("./package.json").version;

exports.default = typeof window !== 'undefined' && window.EPI2ME ? require("./dist/rest.web").default : require("./dist/epi2me").default;
