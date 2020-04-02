const EPI2ME = require('../dist');

const epi2me = new EPI2ME();

epi2me.SampleReader.getExperiments({ sourceDir: '/Library/MinKNOW/data' }).then(console.info);
