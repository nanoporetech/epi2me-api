const { EPI2ME_RPC } = require('../dist/web');
const { NodeHttpTransport } = require('@improbable-eng/grpc-web-node-http-transport');

const jwt = process.env.JWT;

const client = new EPI2ME_RPC('http://localhost:8080', jwt, NodeHttpTransport());

client.samplesApi.getSamples$().subscribe(console.log);

client.workflowApi.getRunning$().subscribe(console.log);
