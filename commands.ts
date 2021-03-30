import { ensureDir, exists, join } from "./deps.ts";
import { getAsset } from "./utils.ts";

export async function initAssets(dir: string) {
  await ensureDir(dir);

  const readmeOutpath = join(dir, "README.md");
  const gitIgnorePath = join(dir, ".gitignore");
  const swdevWorkerOutpath = join(dir, "__swdev-worker.js");
  const swdevClientOutpath = join(dir, "__swdev-client.js");
  const indexHtmlOutpath = join(dir, "index.html");
  const mainTsxOutpath = join(dir, "main.tsx");

  const svelteAppOutpath = join(dir, "App.svelte");
  await copyIfNotExist(readmeOutpath, "prebuilt/README.md");
  await copyIfNotExist(gitIgnorePath, "prebuilt/.gitignore.raw");
  await copyIfNotExist(swdevClientOutpath, "prebuilt/__swdev-client.js");
  await copyIfNotExist(swdevWorkerOutpath, "prebuilt/__swdev-worker.js");
  await copyIfNotExist(indexHtmlOutpath, "prebuilt/index.html");
  await copyIfNotExist(mainTsxOutpath, "prebuilt/main.tsx");
  await copyIfNotExist(svelteAppOutpath, "prebuilt/App.svelte");
}

export async function updateSelf(dir: string) {
  await ensureDir(dir);

  const swdevWorkerOutpath = join(dir, "__swdev-worker.js");
  const swdevClientOutpath = join(dir, "__swdev-client.js");

  await copyIfNotExist(swdevClientOutpath, "prebuilt/__swdev-client.js");
  await copyIfNotExist(swdevWorkerOutpath, "prebuilt/__swdev-worker.js");
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
