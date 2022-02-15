import { GraphQLFS, instantiateProfileManager } from '@metrichor/epi2me-api'
import gql from 'graphql-tag';
import { asStruct, invariant, isDefined, isOptIndex, isString } from 'ts-runtime-typecheck';

const PROFILE_NAME = ''; // name of profile to use
const WORKFLOW_INSTANCE_ID = ''; // ID of workflow instance to query
const WORKFLOW_ID = ''; // ID of workflow to query

async function main () {
  const profile = await getProfile(PROFILE_NAME);
  const graphql = new GraphQLFS(profile);

  // get the first page of workflows

  const { allWorkflows } = await graphql.workflows({});

  console.log({ allWorkflows: allWorkflows?.results });

  // get a workflow instance with a specific ID
  const { workflowInstance } = await graphql.workflowInstance({ instance: WORKFLOW_INSTANCE_ID });

  console.log({ workflowInstance });

  // use a custom query to get a workflow with a specific ID
  const aWorkflowReponse = await graphql.query(gql`query aWorkflow ($idWorkflow: string) {
    workflow(idWorkflow: $idWorkflow) {
      config
      idWorkflow
    }
  }`, { idWorkflow: WORKFLOW_ID });

  console.log({ aWorkflow: aWorkflowReponse });

  // use pagination to get all the pages of workflow instances
  let page = 0;
  while (true) {
    const { allWorkflowInstances } = await graphql.workflowInstances({ page });
    
    console.log({ page, workflowInstancePage: allWorkflowInstances?.results })

    page += 1;
    if (!allWorkflowInstances?.hasNext) {
      break;
    }
  }
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