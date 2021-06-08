import fs from 'fs';

export async function genericFileStatistics(filePath: string): Promise<{ type: string; bytes: number }> {
  return fs.promises.stat(filePath).then((d) => {
    return { type: 'bytes', bytes: d.size };
  });
}
