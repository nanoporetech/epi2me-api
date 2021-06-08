export interface InputFileOptions {
  inputFolders: string[];
  filetypes?: string | string[];
  outputFolder?: string;
  filter?: (location: string) => boolean | Promise<boolean>;
  errorHandler?: (error: unknown, location: string) => void | Promise<void>;
}

export interface FileStat {
  name: string;
  path: string;
  relative: string;
  size: number;
  id: string;
}
