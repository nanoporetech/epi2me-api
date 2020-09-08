const { EPI2ME_RPC } = require('../dist/web');

const jwt = process.env.JWT;

const client = new EPI2ME_RPC('http://localhost:8080', jwt);

client
  .healthCheck()
  .then((data) => console.info('DATA:', data))
  .catch((error) => console.error('REJECT:', error));
