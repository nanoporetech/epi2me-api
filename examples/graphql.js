const {
  merge
} = require('lodash');
const EPI2ME = require('../');

const p = new EPI2ME.Profile().profile('staging_signed');
const api = new EPI2ME(
  merge({
      url: p.endpoint,
    },
    p,
  ),
);

api.graphQL.workflows().then(console.log); // eslint-disable-line
