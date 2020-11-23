const { EPI2ME, Factory } = require('../dist/core');

// const { Factory } = EPI2ME;

const profileName = process.argv[2] || 'production_signed';
const profile = new EPI2ME.Profile().profile(profileName);

const api = new Factory(EPI2ME, profile);
// console.log('OPTIONS: ', api.masterInstance.config.options);

api.graphQL
  .workflows()
  .then(console.info)
  .catch(console.error);

// api.startRun(
//   { inputFolders: ['/Library/MinKNOW/data/data2/mock_reads'], outputFolder: '/Library/MinKNOW/data/data2/output' },
//   { id_workflow: 1964 },
// );

api.runningInstances$.subscribe(instances => console.log("RUNNING: ", Array.from(instances.keys())))

api.startGQLRun(
  { inputFolders: ['/Library/MinKNOW/data/data2/mock_reads'], outputFolder: '/Library/MinKNOW/data/data2/output' },
  { idWorkflow: 1964, isConsentedHuman: false, computeAccountId: 71616668 },
).then(
  thing => {
    sleep(5000);
    const i = api.getRunningInstance(thing.id);
    i.stopUpload();
  }
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

sleep(10000);

// Reference upload
// api.startRun(
//   {
//     inputFolders: ['/Users/cramshaw/Downloads/S288C.fasta'],
//     outputFolder: '/Library/MinKNOW/data/data2/output',
//     filetype: ['fasta'],
//   },
//   { id_workflow: 1714, isConsentedHuman: 1 },
// );

// api.graphQL
//   .instanceToken({ variables: { idWorkflowInstance: 164901 } })
//   .then(x => console.info(x.data.token))
//   .catch(console.error);

// api.graphQL
//   .healthCheck()
//   .then(console.log)
//   .catch(console.error);
