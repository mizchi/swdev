import { parse, rollup, httpResolve, expandGlob, virtualFs, ensureDir } from "./deps.ts";
import { loadTs, transform, compress } from "./plugins.ts";

const args = parse(Deno.args);
const [task, second] = args._ as string[];
const log = (...args: any) => console.log("[swdev-dev]", ...args);

async function buildClientAssets() {
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
      compress(),
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
      compress(),
    ],
  }).then((g) => g.generate({ format: "es" }));

  return {
    "__swdev-worker.js": sourceGen.output[0].code,
    "__swdev-client.js": clientGen.output.[0].code,
  };
}

switch (task) {
  case "buildClientAssets": {
    // initialize
    const prebuiltData: { [k: string]: string } = await buildClientAssets();

    // Add template to prebulitData
    for await (const file of expandGlob("template/*")) {
      if (file.isFile) {
        prebuiltData[file.name] = await Deno.readTextFile(file.path);
      }
    }
    await Deno.writeTextFile(
      "prebuilt.ts",
      `export default ${JSON.stringify(prebuiltData)}`
    );
    log("generate prebuilt.ts", Object.keys(prebuiltData));
    break;
  }
  case "build": {
    const { bundle } = await import("./bundler.ts");
    bundle(second ?? ".");
    break;
  }
  case "dev": {
    const port = 7778;
    const process = Deno.run({
      cmd: [
        "deno",
        "run",
        "--unstable",
        "--allow-net",
        `--allow-read=${Deno.cwd()}`,
        "run_server.ts",
        second ?? ".",
        "-p",
        port.toString(),
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const endpoint = "ws://localhost:17777";
    console.log(`[swdev:asset-server] http://localhost:${port}`);
    console.log(`[swdev:ws] ${endpoint}`);

    const { code } = await process.status();

    if (code === 0) {
      const rawOutput = await process.output();
      await Deno.stdout.write(rawOutput);
    } else {
      const rawError = await process.stderrOutput();
      const errorString = new TextDecoder().decode(rawError);
      console.log(errorString);
    }
    Deno.exit(code);
  }
  case "install": {
    const process = Deno.run({
      cmd: [
        "deno",
        "install",
        "-qAf",
        "--unstable",
        "https://deno.land/x/swdev/swdev.ts",
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const { code } = await process.status();
    if (code === 0) {
      const rawOutput = await process.output();
      await Deno.stdout.write(rawOutput);
    } else {
      const rawError = await process.stderrOutput();
      const errorString = new TextDecoder().decode(rawError);
      console.log(errorString);
    }
    Deno.exit(code);
  }
}
