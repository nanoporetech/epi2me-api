const EPI2ME = require('../dist');

const epi2me = new EPI2ME();

epi2me.SampleReader.getExperiments({ sourceDir: '/Library/MinKNOW/data' }).then(samples => {
  Object.keys(samples).forEach(key => {
    console.log(key);
    console.log(samples[key]);
  });
});

// epi2me.SampleReader.getExperiments({ sourceDir: '/Library/MinKNOW/data' }).then(samples => {
//   Object.keys(samples).forEach(key => {
//     console.log(key);
//     console.log(samples[key]);
//   });
// });
