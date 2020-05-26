const EPI2ME = require('../dist');

const { Factory } = EPI2ME;

const profileName = process.argv[2] || 'production_signed';
const profile = new EPI2ME.Profile().profile(profileName);

const api = new Factory(EPI2ME, profile);
// console.log('OPTIONS: ', api.masterInstance.config.options);

api.graphQL
  .workflowInstance({ variables: { idWorkflowInstance: 164811 } })
  .then(console.info)
  .catch(console.error);

api.graphQL
  .stopWorkflow({ variables: { idWorkflowInstance: 164811 } })
  .then(console.info)
  .catch(console.error);
