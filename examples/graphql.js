const EPI2ME = require('..');

const profileName = process.argv[2] || 'production_signed';
const profile = new EPI2ME.Profile();
const api = new EPI2ME(profile.profile(profileName));

api.graphQL.workflows().then(console.log); // eslint-disable-line
