const {
  merge
} = require('lodash');
const EPI2ME = require('../');

const {
  Profile
} = EPI2ME;

const profileName = process.argv[2] || 'production_signed';
const profile = new Profile().profile(profileName);

const api = new EPI2ME(
  merge({
      url: profile.endpoint,
    },
    profile,
  ),
);

api.graphQL.workflows().then(console.log); // eslint-disable-line
