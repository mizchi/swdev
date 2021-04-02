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
    // need allow-write
    async writeTextFile(filepath: string, content: string) {
      const fpath = join(watchRoot, filepath);
      return Deno.writeTextFile(fpath, content);
    },
    // need --allow-run
    async run(cmd: string[]) {
      const p = Deno.run({
        cwd: watchRoot,
        cmd,
        stdin: "piped",
        stdout: "piped",
      });
      return new TextDecoder().decode(await p.output());
    },
  };
}

export type ServerApiImpl = ReturnType<typeof createApi>;
