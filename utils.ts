import * as path from "https://deno.land/std@0.91.0/path/mod.ts";

export async function getAsset(filepath: string, host?: string | undefined) {
  if (host) {
    const dest = path.join(host, filepath);
    return await fetch(dest).then((res) => res.text());
  } else {
    // DEVELOPMENT
    return await Deno.readTextFile(filepath);
  }
}
