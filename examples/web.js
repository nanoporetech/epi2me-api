const fs = require('fs-extra');
const path = require('path');

const EPI2ME = require('../dist/web/index.js');

const { profiles } = fs.readJSONSync(path.join(process.env.HOME, '.epi2me.json'), 'utf8');
const { apikey, apisecret } = Object.values(profiles).filter(p => p.endpoint.match(/epi2me.nanoporetech.com/g))[0];

const client = new EPI2ME({
  apikey,
  apisecret,
});

client
  .user()
  .then(data => console.info('DATA:', data))
  .catch(error => console.error('REJECT:', error));
