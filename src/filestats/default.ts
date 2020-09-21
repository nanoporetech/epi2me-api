import fs from 'fs-extra';

export default async function (filePath: string): Promise<{ type: string; bytes: number }> {
  return fs.stat(filePath).then((d) => {
    return { type: 'bytes', bytes: d.size };
  });
}
