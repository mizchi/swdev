import {
  preprocess,
  compile as svelteCompile,
} from "https://cdn.esm.sh/svelte/compiler";

import ts from "https://cdn.esm.sh/typescript";
import { rollup, Plugin } from "http://cdn.esm.sh/rollup";
import { virtualFs } from "http://cdn.esm.sh/rollup-plugin-virtual-fs";
import { httpResolve } from "http://cdn.esm.sh/rollup-plugin-http-resolve";
import { ensureDir, exists } from "https://deno.land/std@0.91.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";

let tsCode: string | null = null;
const loadTs = () =>
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
        return tsCode;
      }
    },
  } as Plugin);

const svelte = () =>
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

const tsPreprocess = () => {
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

const transform = () => {
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

const denoLoader = () =>
  ({
    name: "deno-loader",
    async resolveId(id: string, importer: string | undefined) {
      const realpath = importer ? path.join(path.dirname(importer), id) : id;
      console.log("deno-loader:resolve", realpath);
      // console.log("deno-loader:resolveId", id, importer);
      if (await exists(realpath)) {
        console.log("deno-loader:resolveId", realpath);
        return realpath;
      }
      return;
    },
    async load(id: string) {
      if (await exists(id)) {
        const content = await Deno.readTextFile(id);
        console.log("deno-loader:load", id, content.slice(0, 10), "...");
        return content;
      }
    },
    transform(code: string, id: string) {
      if (id.endsWith(".ts") || id.endsWith(".tsx")) {
        console.log("deno-loader:transform", id);

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

export async function bundle(entryPath: string) {
  const sourceGen = await rollup({
    input: entryPath,
    plugins: [
      httpResolve({
        resolveIdFallback(id: string, importer: any) {
          if (importer == null) {
            return;
          }
          if (id.startsWith(".")) {
            return;
          }
          if (id.startsWith("https://")) {
            return id;
          }
          if (id.includes("svelte")) {
            return `https://cdn.skypack.dev/${id}`;
          }
          return `https://cdn.esm.sh/${id}`;
        },
      }),
      denoLoader(),
      svelte(),
    ],
  }).then((g: any) => g.generate({ format: "es" }));
  const outpath = entryPath.replace(/(.*)\.tsx?/, "$1.bundle.js");
  await Deno.writeTextFile(outpath, sourceGen.output[0].code);
}

export async function prebuild(dir: string) {
  const sourceGen = await rollup({
    input: "/swdev-worker.ts",
    onwarn(warn: any) {
      if (warn.toString().includes("keyword is equivalent")) {
        return;
      }
    },
    plugins: [
      loadTs(),
      httpResolve({
        resolveIdFallback(id: string, importer: any) {
          if (importer == null) {
            return;
          }
          if (id.startsWith(".")) {
            return;
          }
          if (id.startsWith("https://")) {
            return id;
          }
          return `https://cdn.esm.sh/${id}`;
        },
      }),
      virtualFs({
        files: {
          "/swdev-worker.ts": await Deno.readTextFile(
            "./client-src/swdev-worker.ts"
          ),
        },
      }),
      transform(),
    ],
  }).then((g: any) => g.generate({ format: "es" }));
  const clientGen = await rollup({
    input: "/swdev-client.ts",
    onwarn(warn: any) {
      if (warn.toString().includes("keyword is equivalent")) {
        return;
      }
    },
    plugins: [
      virtualFs({
        files: {
          "/swdev-client.ts": await Deno.readTextFile(
            "./client-src/swdev-client.ts"
          ),
        },
      }),
      transform(),
    ],
  }).then((g) => g.generate({ format: "es" }));

  const swdevOutpath = path.join(dir, "__swdev-worker.js");
  const swdevClientOutpath = path.join(dir, "__swdev-client.js");

  await Deno.writeTextFile(swdevOutpath, sourceGen.output[0].code);
  await Deno.writeTextFile(swdevClientOutpath, clientGen.output[0].code);
  console.log("[swdev:generate]", swdevOutpath);
  console.log("[swdev:generate]", swdevClientOutpath);
}

export async function buildSwdevAssets(dir: string) {
  await ensureDir(dir); // returns a promise
  await prebuild(dir);

  const indexHtmlOutpath = path.join(dir, "index.html");
  if (await exists(indexHtmlOutpath)) {
    // skip
    console.log("[swdev:skip-generate]", indexHtmlOutpath);
  } else {
    const html = await Deno.readTextFile(
      path.join(Deno.cwd(), "template.html")
    );
    await Deno.writeTextFile(indexHtmlOutpath, html);
    console.log("[swdev:generate]", indexHtmlOutpath);
  }
}
