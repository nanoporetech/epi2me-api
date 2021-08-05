import type { FileStat, InputFileOptions } from './inputScanner.type';

import { createInspector } from 'fs-inspect';
import { basename } from 'path';
import { getNormalisedFileExtension } from './file_extensions';

const COMMON_ILLEGAL_BASENAMES = new Set(['downloads', 'skip', 'fail', 'fastq_fail', 'tmp']);

let idCounter = 0;

export function createFileID(): string {
  idCounter += 1;
  return `${idCounter.toString().padStart(4, '0')}`;
}

export function createExtensionFilter(filetypes: string | string[]): (base: string) => boolean {
  // MC-6727 support array of types: backwards compatibility support for single string value
  const filetypesArray = Array.isArray(filetypes) ? filetypes : [filetypes];

  // TODO getNormaalisedFileExtension expects a filePath, not an extension... so we have to fudge it a little
  const filetypesSet = new Set(filetypesArray.map((ext: string) => getNormalisedFileExtension(`unknown.${ext}`)));

  if (filetypesSet.size > 0) {
    return (base: string) => {
      const ext = getNormalisedFileExtension(base);
      return filetypesSet.has(ext);
    };
  }

  return () => true;
}

/*
  this is a relatively simple port from the old version to
  use fs-inspect ( simplifies our code significantly )

  TODO this creates a fair number of objects which
  could easily be reused
*/
export async function loadInputFiles({
  inputFolders,
  outputFolder,
  filetypes,
  filter,
  errorHandler,
}: InputFileOptions): Promise<FileStat[]> {
  const extensionFilter = createExtensionFilter(filetypes ?? '');
  const outputBasename = outputFolder ? basename(outputFolder) : null;

  const { search } = createInspector({
    exclude({ base }) {
      // WARN this check for the output folder doesn't seem correct, but its what the old version did...
      return COMMON_ILLEGAL_BASENAMES.has(base) || base === outputBasename;
    },
    filter({ base, absolute }) {
      if (!extensionFilter(base)) {
        return false;
      }
      return filter ? filter(absolute) : true;
    },
    map({ size, base: name, absolute: path, relative }) {
      const result = {
        size,
        name,
        path,
        relative,
        id: createFileID(),
      };
      // NOTE check if we are uploading a single file. In that case modify the relative path
      // so that appears we scanned the parent directory and found a single file. This ensures
      // our upload actually has a relative path.
      if (relative === '') {
        result.relative = name;
      }
      return result;
    },
    catch: errorHandler,
  });

  const results = [];
  for (const location of inputFolders) {
    const files = await search(location);
    results.push(...files);
  }
  return results;
}
