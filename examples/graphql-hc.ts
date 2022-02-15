import { GraphQLFS, instantiateProfileManager } from '@metrichor/epi2me-api'
import { asStruct, invariant, isDefined, isString } from 'ts-runtime-typecheck';

const PROFILE_NAME = ''; // name of profile to use

async function main () {
  const profile = await getProfile(PROFILE_NAME);
  const graphql = new GraphQLFS(profile);

  const status = await graphql.healthCheck();
  console.log(status);
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