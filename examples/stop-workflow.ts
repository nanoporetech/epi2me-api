import { GraphQLFS, instantiateProfileManager } from '@metrichor/epi2me-api'
import { asStruct, invariant, isDefined, isString } from 'ts-runtime-typecheck';

const PROFILE_NAME = ''; // name of profile to use
const WORKFLOW_INSTANCE_ID = ''; // ID of workflow instance to query

async function main () {
  const profile = await getProfile(PROFILE_NAME);
  const graphql = new GraphQLFS(profile);

  // get a workflow instance with a specific ID
  const { workflowInstance } = await graphql.workflowInstance({ instance: WORKFLOW_INSTANCE_ID });

  console.log({ workflowInstance });

  const { stopData } = await graphql.stopWorkflow({ instance: WORKFLOW_INSTANCE_ID });

  console.log({ stopData });
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