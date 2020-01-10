const fs = require('fs-extra');
const path = require('path');
const {
  homedir
} = require('os');
const EPI2ME = require('../dist/web');

const profile = new EPI2ME.Profile(fs.readJSONSync(path.join(homedir(), '.epi2me.json'), 'utf8'));
const client = new EPI2ME(profile.profile('development_signed')); // key data members are apikey, apisecret, endpoint

client.REST.user()
  .then(data => console.info('DATA:', data))
  .catch(error => console.error('REJECT:', error));
