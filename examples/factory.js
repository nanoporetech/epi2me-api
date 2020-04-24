const EPI2ME = require('../dist');

const { Factory } = EPI2ME;

const profileName = process.argv[2] || 'production_signed';
const profile = new EPI2ME.Profile().profile(profileName);

const api = new Factory(EPI2ME, profile);
// console.log('OPTIONS: ', api.masterInstance.config.options);

api.graphQL
  .workflows()
  .then(console.info)
  .catch(console.error);

api.startRun(
  { inputFolders: ['/Library/MinKNOW/data/data2/mock_reads'], outputFolder: '/Library/MinKNOW/data/data2/output' },
  { id_workflow: 1964, isConsentedHuman: 1 },
);

// Reference upload
// api.startRun(
//   {
//     inputFolders: ['/Users/cramshaw/Downloads/S288C.fasta'],
//     outputFolder: '/Library/MinKNOW/data/data2/output',
//     filetype: ['fasta'],
//   },
//   { id_workflow: 1714, isConsentedHuman: 1 },
// );
