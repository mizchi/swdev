export type RevalidateCommand = {
  type: "revalidate";
  paths: string[];
};

export type Command = RevalidateCommand;

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
