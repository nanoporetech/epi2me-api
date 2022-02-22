import { instantiateProfileManager, EPI2ME } from '@metrichor/epi2me-api'
import { asStruct, invariant, isDefined, isString } from 'ts-runtime-typecheck';

const PROFILE_NAME = ''; // name of profile to use
const SOCKET_CHANNEL = ''; // channel to watch for data

async function main () {
  const profile = await getProfile(PROFILE_NAME);
  const epi2me = new EPI2ME(profile);

  const socket = epi2me.getSocket();

  let message = 0;

  socket.watch(SOCKET_CHANNEL, data => {
    console.log({ message, data });
    message += 1;
  });
}

main().catch(console.error)

const asVerifiedProfile = asStruct({
  apikey: isString,
  apisecret: isString,
});

async function getProfile (description: string) {
  const { manager } = await instantiateProfileManager();
  const profile = manager.get(description);

  invariant(isDefined(profile), `No profile found with the name ${description}.`);

  return asVerifiedProfile(profile);
}