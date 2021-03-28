import { rollup } from "https://cdn.esm.sh/rollup";
import { httpResolve } from "https://cdn.esm.sh/rollup-plugin-http-resolve";
import { denoLoader, svelte, compress } from "./plugins.ts";

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
      compress(),
    ],
  }).then((g: any) => g.generate({ format: "es" }));
  const outpath = entryPath.replace(/(.*)\.tsx?/, "$1.bundle.js");
  await Deno.writeTextFile(outpath, sourceGen.output[0].code);
}
