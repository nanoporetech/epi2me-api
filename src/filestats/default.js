import fs from 'fs-extra';

export default async function(filePath) {
  return fs.stat(filePath).then(d => {
    return { bytes: d.size };
  });
}
