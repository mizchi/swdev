import { ensureDir, exists } from "https://deno.land/std@0.91.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";
import { getAsset } from "./utils.ts";

export async function initAssets(dir: string) {
  await ensureDir(dir);

  const readmeOutpath = path.join(dir, "README.md");
  const gitIgnorePath = path.join(dir, ".gitignore");
  const swdevWorkerOutpath = path.join(dir, "__swdev-worker.js");
  const swdevClientOutpath = path.join(dir, "__swdev-client.js");
  const indexHtmlOutpath = path.join(dir, "index.html");
  const mainTsxOutpath = path.join(dir, "main.tsx");
  
  const svelteAppOutpath = path.join(dir, "App.svelte");
  await copyIfNotExist(readmeOutpath, "prebuilt/README.md");
  await copyIfNotExist(gitIgnorePath, "prebuilt/.gitignore.raw");
  await copyIfNotExist(swdevClientOutpath, "prebuilt/__swdev-client.js");
  await copyIfNotExist(swdevWorkerOutpath, "prebuilt/__swdev-worker.js");
  await copyIfNotExist(indexHtmlOutpath, "prebuilt/index.html");
  await copyIfNotExist(mainTsxOutpath, "prebuilt/main.tsx");
  await copyIfNotExist(svelteAppOutpath, "prebuilt/App.svelte");
}

const dev = false;
const prodHost = dev ? undefined : "https://deno.land/x/swdev";

async function copyIfNotExist(outpath: string, original: string) {
  if (await exists(outpath)) {
    // skip
    console.log("[swdev:skip-generate]", outpath);
  } else {
    const content = await getAsset(original, prodHost);
    await Deno.writeTextFile(outpath, content);
    console.log("[swdev:generate]", outpath);
  }
}
