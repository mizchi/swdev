export type GetFilesCommand = {
  type: "files";
  files: string[];
};

export type ReadFileCommand = {
  type: "read-file";
  filepath: string;
};

export type WriteFileCommand = {
  type: "write-file";
  filepath: string;
  content: string;
};

export type RevalidateCommand = {
  type: "revalidate";
  paths: string[];
};

export type Command = RevalidateCommand | GetFilesCommand;

export interface ServeArgs {
  _: string[];
  // -p --port
  p?: number;
  port?: number;
  // --cors
  cors?: boolean;
  dotfiles?: boolean;
  // --host
  host?: string;
  // -c --cert
  c?: string;
  cert?: string;
  // -k --key
  k?: string;
  key?: string;
  // -h --help
  h?: boolean;
  help?: boolean;
}
