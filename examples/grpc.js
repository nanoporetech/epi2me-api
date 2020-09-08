const { EPI2ME_RPC } = require('../dist/web');

const jwt = process.env.JWT;

const client = new EPI2ME_RPC('http://localhost:8080', jwt);

client.workflowApi.getRunning$().subscribe(console.log);
