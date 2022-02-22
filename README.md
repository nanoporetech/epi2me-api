# EPI2ME API

<a href="http://metrichor.com"><img src="https://epi2me.nanoporetech.com/gfx/logo_print.png" height="74" alt="A stylised letter E made of 3 coloured horizontal bars followed by the word EPI2ME. The colours are turquoise, yellow and blue." align="right"></a>

This API provides utilities for communicating with the EPI2ME Platform for the analysis of nanopore data. It is used by the EPI2ME Agent & CLI. It is intended to be used with Node.js. More information on the EPI2ME platform can be found at [metrichor.com](https://metrichor.com/).

## Installation

```sh
npm i @metrichor/epi2me-api
```

In addition to the main module a "web" variant exists which can work in a browser. It is limited to the GraphQL API, and does not expose any methods for reading files from disk. Additionally the GraphQL client is limited to JWT based authentication.

```sh
npm i @metrichor/epi2me-web
```

## GraphQL API

The EPI2ME service is implemented as a GraphQL API. This provides a great amount of flexibility with what data you want to request, and as a bonus provides amazing TypeScript support via graphql-codegen.

Normally GraphQL is intended to be used with situation specific queries, not generalized ones. However, we do provide some general purpose version of standard queries. You may find that you can get more relevant information by writing your own query, or that a custom query takes less time to complete. So it's advised to consider what fields you actually want and write your own query. But the inbuilt queries offer convenience during the prototyping stage of a project.

### Authentication, GraphQL clients and context

Our GraphQL service requires authentication. This can be provided either by using a JWT or a API key/secret pair.

To create an authenticated connection using an API key/secret pair instantiate a GraphQLFS instance.

```ts
import { GraphQLFS } from '@metrichor/epi2me-api';

const client = new GraphQLFS({
  apikey,
  apisecret,
});
```

The constructor accepts some other options, such as the `url` of the environment and a `proxy` configuration string. But `apikey`/`apisecret` are the only required ones. The new client instance encapsulates the authenticated connection to the GraphQL server, allowing you to perform queries and mutations.

This client object exposes `query` and `mutate` methods that accept a document and variables and perform the request. It is advised to generate documents ahead of time using graphql-codegen, as when used in conjunction with the schema it will validate your queries. However, you can also generate documents at runtime using the graphql tag library. In addition to `query` and `mutate` the client also defines `wrapQuery` and `wrapMutation` methods which allow for partial application of a document to `query` and `mutate` respectively. A number of inbuilt queries and mutations are also defined for common operations.

- `workflows` list available workflows in the current region; this query is paginated.
- `workflow` get details for a specific workflow using a workflow ID.
- `workflowInstance` get details for a specific workflow instance using a workflow instance ID.
- `workflowInstances` list workflow instances in the current region; this query is paginated.
- `startWorkflow` instantiate a workflow in the current region with workflow ID and a set of parameters. Will return details of the workflow instance.
- `stopWorkflow` stop a workflow instance with a given workflow instance ID.
- `instanceToken` create an instance token for accessing the S3 bucket and SQS queue belonging to a workflow instance.
- `user` get details about the current user.
- `updateUser` change the preferred region of the current user.
- `regions` list available regions.

## Running a workflow

The primary use for the EPI2ME API is to run workflows. In the case you are starting a workflow from an existing dataset, and only wish to view the resulting report then it should be sufficient to construct a GraphQL client and make a startWorkflow mutation. This will not allow you to upload files or (easily) monitor the state of the workflow instance.

```ts
import { GraphQLFS } from '@metrichor/epi2me-api';

async function main (profile: Profile, isConsentedHuman: boolean) {
  const { apikey, apisecret, compute_account: computeAccountId } = profile;

  const client = new GraphQLFS({ apikey, apisecret });

  const { instance } = await client.startWorkflow({
    computeAccountId,
    isConsentedHuman,
    idWorkflow: '<ID of the workflow to run>',
    idDataset: '<ID of source dataset>'
  });

  console.log(`Started workflow instance ${instance.idWorkflowInstance}`)
}

```

A more comprehensive option is instantiate an `EPI2ME` instance. This will encapsulate a GraphQL client, file scanner/uploader, telemetry monitoring and observe the status of the attached workflow instance.

```ts

import { EPI2ME, Profile } from '@metrichor/epi2me-api'

async function main (profile: Profile, isConsentedHuman: boolean) {
  const { apikey, apisecret, compute_account: computeAccountId } = profile;

  const epi2me = new EPI2ME({
    apikey,
    apisecret,
    inputFolders: [
      '<folder path for files to upload>'
    ],
    outputFolder: '<folder path for files to download>'
    useGraphQL: true, // for compatibility the instance currently defaults to REST mode, but we are in the process of deprecating our REST backend
  });

  // autoStartGQL accepts the same parameters as GraphQL.prototype.startWorkflow
  await epi2me.autoStartGQL({
    isConsentedHuman,
    computeAccountId,
    idWorkflow: '<ID of the workflow you want to run>',
  });

  console.log(`Started workflow instance ${epi2me.id}`)

  // observe the report state and signal when the report is ready
  epi2me.reportState$.subscribe(isReady => {
    if (isReady) {
      console.log('Report is ready!')
    }
  })
}

```

## Profiles

When using EPI2ME applications they can register a profile for a given user. This stores the authentication required to utilise that user on the device. You can read and modify profiles on the current device using the profile manager.

```ts
import { instantiateProfileManager } from '@metrichor/epi2me-api'

async function main () {
  const { manager } = await instantiateProfileManager();

  const names = Array.from(manager.profileNames());
  
  const firstProfile = manager.get(names[0]);

  console.log(`The apikey for the profile ${names[0]} is ${firstProfile.apikey}`)
}
```

Profiles can also hold an `endpoint` as well as `compute_account` value. The account value in particular can be very helpful as it means you don't have to query a list of accounts for a user and pick one. It is however worth noting that all of the field of a profile are _optional_ so you should check they exist before attempting to utilise the profile.

EPI2ME applications do not monitor profiles for changes on disk, so if you change any profiles any active application will have to be restarted before it will observe any changes. Any changes made to profiles by EPI2ME applications will be immediately be written to disk, so it's best to avoid modifying the profile list in multiple processes at once otherwise you risk race conditions.

## Instance lifecycle

Once an EPI2ME instance has been created it triggers several services that run for the duration of the instance.

### File Uploader

The specified input folders are scanned on an interval for new files. If the files fulfil the criteria of the uploader ( not yet uploaded and correct file type ) then they are concurrently uploaded. After each file is uploaded a message is send to the backend to indicate that there is new data available.

If you are running off static data you will probably not want to continue scanning for new files once all your files have been uploaded. You can monitor the status of the file uploads using `liveStates$` which is an observable that contains statistics about uploaded and downloaded files.

To stop the file uploaded call `stopUpload()`. This will not stop the analysis of the data, or the download of results.

### Telemetry

You can process the telemetry of the workflow in real time by utilizing `instanceTelemetry$` which is an observable containing the JSON blobs from each workflow component in the chain. Changes in this data are received through polling, updated telemetry is only pulled down if a change has occurred though.

### Output Data

Once data has passed through the workflow the client is notified of result data, which can then optionally be downloaded to the client. Setting the `downloadMode` to `data` or `data+telemetry` will cause the output to be downloaded and written to disk. The progress of downloads can be observed using `liveStates$` which is an observable that contains statistics about uploaded and downloaded files.

### Stopping an Analysis

As analyses are designed to receive new data as it's being generated they do not have a classical "complete" state. They rather have a "analyzing" and "idle" state, once all the uploaded data has been processed they will sit idle waiting for more data. Once you are happy that all of your data has been processed you need to notify the system that you have finished and stop the analysis. You can remotely stop any running workflow from the EPI2ME agent and portal easily. Through the API you can either use the `stopWorkflow` mutation to stop your workflow, or if you have instantiated an EPI2ME instance you can call `stopAnalysis`.

## Datasets

Each component in a workflow instance creates it's own "dataset". By default datasets are deleted within 24 hours of an analysis being stopped, but if you pass in the `storeResults` flag when starting the workflow they will be persisted. Alternatively you can view the dataset on the EPI2ME portal while the analysis is being run and set specific datasets to be persisted.

Datasets give you the means to run a workflow from data which you have already uploaded and/or processed. EPI2ME will also keep track of the relationship between your datasets, so that you can easily track the source of particular data. You can also download a dataset at a later date.

You can start workflows from dataset using the start workflow mutation by specifying a dataset ID in it's parameters. It's also possible to start a workflow from a dataset using the EPI2ME portal and CLI.

## Development

The EPI2ME API is under constant refinement based on the requirements and capabilities of the system. We are currently in the process of migrating from a REST based backend to a newer GraphQL one. For compatibility we are supporting both for the time being, but once internal projects have migrated away from the old REST API those components will be removed facilitating further simplification and improvement to this library.
