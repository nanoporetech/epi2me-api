import tmp from 'tmp-promise';
import path from 'path';
import fs from 'fs';

import { DisposableCollection } from './Disposable';

interface MockFolder {
  [name: string]: MockFolder | string;
}

export interface MockResult {
  path: string;
  cleanup(): Promise<void>;
}

export async function mockFS(data: MockFolder): Promise<MockResult> {
  const dir = await tmp.dir();
  const disposer = new DisposableCollection();

  await createEntry(dir.path, data, disposer);

  disposer.add(() => dir.cleanup());

  return {
    path: dir.path,
    cleanup: () => disposer.dispose(),
  };
}

async function createEntry(filepath: string, data: MockFolder, disposer: DisposableCollection): Promise<void> {
  for (const [name, value] of Object.entries(data)) {
    const subpath = path.join(filepath, name);
    if (typeof value === 'string') {
      await fs.promises.writeFile(subpath, value);
      disposer.add(() => fs.promises.rm(subpath));
      // console.log(`Creating file ${subpath}`);
    } else {
      await fs.promises.mkdir(subpath);
      // console.log(`Creating folder ${subpath}`);
      await createEntry(subpath, value, disposer);
      disposer.add(() => fs.promises.rmdir(subpath));
    }
  }
}
