import {
  preprocess,
  compile as svelteCompile,
} from "https://cdn.esm.sh/svelte/compiler";

import ts from "https://cdn.esm.sh/typescript";
import { Plugin } from "https://cdn.esm.sh/rollup";
import { exists } from "https://deno.land/std@0.91.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";

// cache in tmp
const TS_CODE_PATH = "/tmp/_tscode.js";
let tsCode: string | null = await Deno.readTextFile(TS_CODE_PATH).catch(
  (_e) => null
);

export const loadTs = () =>
  ({
    name: "ts-in-rollup",
    resolveId(id: string) {
      if (id === "typescript") {
        return id;
      }
    },
    async load(id: string) {
      if (id === "typescript") {
        if (tsCode != null) return tsCode;
        const code = await fetch(
          "https://cdn.jsdelivr.net/npm/typescript@4.2.3/lib/typescript.js"
        ).then((res) => res.text());
        const rewrote = code
          .replace(/require\("perf_hooks"\)/, "{}")
          .replace(/require\("inspector"\)/, "{}");
        tsCode =
          `globalThis.window = self;\n` + rewrote + `export default ts;\n`;
        await Deno.writeTextFile(TS_CODE_PATH, tsCode);
        return tsCode;
      }
    },
  } as Plugin);

export const svelte = () =>
  ({
    name: "svelte",
    async transform(code: string, id: string) {
      if (id.endsWith(".svelte")) {
        const { code: preprocessed } = await preprocess(
          code,
          [tsPreprocess()],
          {
            filename: "$.tsx",
          }
        );
        const compiled = svelteCompile(preprocessed, {
          css: false,
        });
        return compiled.js.code;
      }
      return;
    },
  } as Plugin);

const log = (...args: any) => console.log("[deno-loader]", ...args);

export const tsPreprocess = () => {
  const script: any = async ({ content, filename }: any) => {
    const out = ts.transpile(content, {
      fileName: filename ?? "/$$.tsx",
      target: ts.ScriptTarget.ES2019,
    });
    return { code: out };
  };
  return {
    script,
  };
};

export const transform = () => {
  return {
    name: "ts-transform",
    transform(code: string, id: string) {
      if (id.endsWith(".ts") || id.endsWith(".tsx")) {
        const out = ts.transpile(code, {
          target: ts.ScriptTarget.ES2019,
        });
        return out;
      }
      return;
    },
  } as Plugin;
};

export const denoLoader = () =>
  ({
    name: "deno-loader",
    async resolveId(id: string, importer: string | undefined) {
      const realpath = importer ? path.join(path.dirname(importer), id) : id;
      // console.log("[deno-loader:resolve]", realpath);
      // console.log("deno-loader:resolveId", id, importer);
      if (await exists(realpath)) {
        // console.log("deno-loader:resolveId]", realpath);
        return realpath;
      }
      return;
    },
    async load(id: string) {
      if (await exists(id)) {
        const content = await Deno.readTextFile(id);
        // console.log("deno-loader:load", id, content.slice(0, 10), "...");
        return content;
      }
    },
    transform(code: string, id: string) {
      if (id.endsWith(".ts") || id.endsWith(".tsx")) {
        // console.log("deno-loader:transform", id);
        const out = ts.transpile(code, {
          filename: "$.tsx",
          target: ts.ScriptTarget.ES2019,
          jsx: ts.JsxEmit.React,
        });
        return out;
      }
      return;
    },
  } as Plugin);
