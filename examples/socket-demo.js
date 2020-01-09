/* simple websocket (socket.io) demo.
 * run like:
 * node examples/socket-demo.js <profilename> <channelname>
 * e.g.
 * node examples/socket-demo.js development_signed workflow_instance:update:1234
 */
const EPI2ME = require('..');

const {
  Profile
} = EPI2ME;

const profileName = process.argv[2] || 'classic';
const channelName = process.argv[3] || 'workflow_instance:update:1234';

const profile = new Profile().profile(profileName);

const epi2me = new EPI2ME({
  apikey: profile.apikey,
  url: profile.endpoint,
});

epi2me.socket().then(socket => {
  socket.watch(channelName, data => {
    console.log('event', data); // eslint-disable-line
  });
});
