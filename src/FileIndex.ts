import { asDefined } from 'ts-runtime-typecheck';

const FILE_MARKER = 1;

type FileMarker = typeof FILE_MARKER;
type FolderMarker = Map<string, Marker>;
type Marker = FileMarker | FolderMarker;

let counter = 0;

export class FileIndex {
  private index: FolderMarker = new Map();
  readonly ID = counter++;

  add(location: string): boolean {
    const locationStack = location.split(/\\|\//g);
    const end = asDefined(locationStack.pop());

    let currentIndex: FolderMarker = this.index;

    for (const part of locationStack) {
      const next = currentIndex.get(part);

      if (!next) {
        const newIndex = new Map();
        currentIndex.set(part, newIndex);
        currentIndex = newIndex;
      } else if (next === FILE_MARKER) {
        throw new Error(`Unable to insert ${location} as a file exists as part of its ancestry.`);
      } else {
        currentIndex = next;
      }
    }

    const marker = currentIndex.get(end);

    if (!marker) {
      currentIndex.set(end, FILE_MARKER);
      return true; // new entry added for file
    }

    if (marker === FILE_MARKER) {
      return false; // file was already indexed
    }

    throw new Error(`Unable to insert ${location} as a folder exists at its location.`);
  }

  has(location: string): boolean {
    const locationStack = location.split(/\\|\//g);
    const end = asDefined(locationStack.pop());

    let currentIndex: FolderMarker = this.index;

    for (const part of locationStack) {
      const next = currentIndex.get(part);

      if (!next) {
        return false;
      } else if (next === FILE_MARKER) {
        throw new Error(`Unable to check ${location} for existence as a file exists as part of its ancestry.`);
      }

      currentIndex = next;
    }

    return currentIndex.get(end) === FILE_MARKER; // all files are nil leaves, folders are Maps, absence is undefined
  }
}
