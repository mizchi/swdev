import ts from "https://cdn.esm.sh/typescript";
import { rollup, Plugin } from "http://cdn.esm.sh/rollup";
import { virtualFs } from "http://cdn.esm.sh/rollup-plugin-virtual-fs";
import { httpResolve } from "http://cdn.esm.sh/rollup-plugin-http-resolve";

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
        tsCode = rewrote + "\nexport default ts";
        return tsCode;
      }
    },
  } as Plugin);

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

const source = await Deno.readTextFile("./src/swdev.ts");
const sourceGen = await rollup({
  input: "/swdev.ts",
  onwarn(warn: any) {
    if (warn.toString().includes("keyword is equivalent")) {
      return;
    }
  },
  plugins: [
    loadTs(),
    httpResolve({
      resolveIdFallback(id: string, importer) {
        if (importer == null) {
          return;
        }
        if (id.startsWith(".")) {
          return;
        }
        if (id.startsWith("https://")) {
          return;
        }
        return `https://cdn.esm.sh/${id}`;
      },
    }),
    virtualFs({ files: { "/swdev.ts": source } }),
    transform(),
  ],
}).then((g) => g.generate({ format: "es" }));

const clientSource = await Deno.readTextFile("./src/swdev-client.ts");
const clientGen = await rollup({
  input: "/swdev-client.ts",
  onwarn(warn: any) {
    if (warn.toString().includes("keyword is equivalent")) {
      return;
    }
  },
  plugins: [
    virtualFs({ files: { "/swdev-client.ts": clientSource } }),
    transform(),
  ],
}).then((g) => g.generate({ format: "es" }));

await Deno.writeTextFile("./www/swdev.js", sourceGen.output[0].code);
await Deno.writeTextFile("./www/swdev-client.js", clientGen.output[0].code);
