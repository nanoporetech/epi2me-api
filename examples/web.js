const { GraphQL } = require('../dist/web');
const Profile = require('../dist/profile');

const profile = new Profile().profile(process.argv[2] || 'development_signed');
const client = new GraphQL({ ...profile, url: profile.endpoint }); // rename endpoint to url, normally done by epi2me

client
  .healthCheck()
  .then((data) => console.info('DATA:', data))
  .catch((error) => console.error('REJECT:', error));
