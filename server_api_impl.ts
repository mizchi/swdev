import { expandGlob, join } from "./deps.ts";

export function createApi(watchRoot: string) {
  return {
    async getFiles() {
      const files: string[] = [];
      for await (const file of expandGlob(watchRoot + "/**/*")) {
        if (file.isFile && !file.path.startsWith("__swdev")) {
          files.push(file.path.replace(watchRoot, ""));
        }
      }
      return files;
    },
    async readTextFile(filepath: string) {
      const fpath = join(watchRoot, filepath);
      return Deno.readTextFile(fpath);
    },
    async writeTextFile(filepath: string, content: string) {
      const fpath = join(watchRoot, filepath);
      return Deno.writeTextFile(fpath, content);
    },
  };
}

export type ServerApiImpl = ReturnType<typeof createApi>;
