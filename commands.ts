import { rollup } from "http://cdn.esm.sh/rollup";
import { virtualFs } from "http://cdn.esm.sh/rollup-plugin-virtual-fs";
import { httpResolve } from "http://cdn.esm.sh/rollup-plugin-http-resolve";
import { ensureDir, exists } from "https://deno.land/std@0.91.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";
import { loadTs, transform } from "./plugins.ts";
import { getAsset } from "./utils.ts";

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
}

export async function initAssets(dir: string) {
  await ensureDir(dir);

  const swdevWorkerOutpath = path.join(dir, "__swdev-worker.js");
  const swdevClientOutpath = path.join(dir, "__swdev-client.js");
  const indexHtmlOutpath = path.join(dir, "index.html");
  const mainTsxOutpath = path.join(dir, "main.tsx");
  const svelteAppOutpath = path.join(dir, "App.svelte");

  await copyIfNotExist(swdevClientOutpath, "./prebuilt/__swdev-client.js");
  await copyIfNotExist(swdevWorkerOutpath, "./prebuilt/__swdev-worker.js");
  await copyIfNotExist(indexHtmlOutpath, "./prebuilt/index.html");
  await copyIfNotExist(mainTsxOutpath, "./prebuilt/main.tsx");
  await copyIfNotExist(svelteAppOutpath, "./prebuilt/App.svelte");
}

async function copyIfNotExist(outpath: string, original: string) {
  if (await exists(outpath)) {
    // skip
    console.log("[swdev:skip-generate]", outpath);
  } else {
    const content = await getAsset(original);
    await Deno.writeTextFile(outpath, content);
    console.log("[swdev:generate]", outpath);
  }
}
