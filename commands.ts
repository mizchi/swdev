import { ensureDir, exists } from "https://deno.land/std@0.91.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";
import { getAsset } from "./utils.ts";

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
