import fs from 'fs-extra';

export default async function(filePath) {
  return fs.stat(filePath).then(d => {
    return { type: 'bytes', bytes: d.size };
  });
}
