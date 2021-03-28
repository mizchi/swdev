export type RevalidateCommand = {
  type: "revalidate";
  paths: string[];
};

export type Command = RevalidateCommand;
