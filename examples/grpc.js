const { EPI2ME_RPC } = require('../dist/web');

const jwt = process.env.JWT;

const client = new EPI2ME_RPC('http://localhost:50051', jwt); // rename endpoint to url, normally done by epi2me

client
  .healthCheck()
  .then((data) => console.info('DATA:', data))
  .catch((error) => console.error('REJECT:', error));
