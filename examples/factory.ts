import { EPI2ME, Factory, instantiateProfileManager } from '@metrichor/epi2me-api'
import { asStruct, invariant, isDefined, isOptIndex, isString } from 'ts-runtime-typecheck';

const PROFILE_NAME = ''; // name of profile to use
const SOURCE_DATA_LOCATION = ''; // location of the source data
const WORKFLOW_ID = ''; // ID of the workflow to run 
const ACCOUNT_ID = ''; // ID of account to use

async function main () {
  const profile = await getProfile(PROFILE_NAME);
  const controller = new Factory(EPI2ME, profile);

  controller.runningInstances$.subscribe(instances => {
    console.log("RUNNING: ", Array.from(instances.keys()));
  });

  const instance = await controller.startGQLRun({
    inputFolders: [ SOURCE_DATA_LOCATION ]
  }, {
    idWorkflow: WORKFLOW_ID,
    isConsentedHuman: false,
    computeAccountId: ACCOUNT_ID,
  });

  await sleep(5000);

  instance.stopUpload();
}

main().catch(console.error)

const asVerifiedProfile = asStruct({
  apikey: isString,
  apisecret: isString,
  compute_account: isOptIndex,
});

async function getProfile (description: string) {
  const { manager } = await instantiateProfileManager();
  const profile = manager.get(description);

  invariant(isDefined(profile), `No profile found with the name ${description}.`);

  return asVerifiedProfile(profile);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}