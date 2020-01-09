const fs = require('fs-extra');
const path = require('path');
const EPI2ME = require('../dist/web');

const profile = new EPI2ME.Profile(fs.readJSONSync(path.join(process.env.HOME, '.epi2me.json'), 'utf8'));
const {
  apikey,
  apisecret
} = profile.profile('production_signed');

const client = new EPI2ME({
  apikey,
  apisecret,
});

client.REST.user()
  .then(data => console.info('DATA:', data))
  .catch(error => console.error('REJECT:', error));
