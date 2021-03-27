import * as path from "https://deno.land/std@0.91.0/path/mod.ts";

export async function getAsset(filepath: string, host?: string) {
  // DEVELOPMENT
  if (host == null && import.meta.url.startsWith("file://")) {
    return await Deno.readTextFile(filepath);
  } else {
    const dir = path.dirname(import.meta.url);
    const dest = path.join(dir, filepath);
    const result = await fetch(dest).then((res) => res.text());
    return result;
  }
}
