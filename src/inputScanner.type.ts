export interface InputFileOptions {
  inputFolders: string[];
  filetypes?: string | string[];
  outputFolder?: string;
  filter?: (location: string) => boolean | Promise<boolean>;
}

export interface FileStat {
  name: string;
  path: string;
  relative: string;
  size: number;
  id: string;
}
