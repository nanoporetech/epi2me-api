const EPI2ME = require('..');

const profileName = process.argv[2] || 'production_signed';
const profile = new EPI2ME.Profile().profile(profileName);
const api = new EPI2ME(profile);

api.graphQL
  .workflows()
  .then(console.log)
  .catch(console.log); // eslint-disable-line
