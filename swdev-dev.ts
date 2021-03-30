import {
  parse,
  rollup,
  httpResolve,
  expandGlob,
  virtualFs,
  minify,
  ensureDir,
} from "./deps.ts";
import { loadTs, transform, compress } from "./plugins.ts";
import { version } from "./version.ts";

const args = parse(Deno.args);
const [task, second] = args._ as string[];
const log = (...args: any) => console.log("[swdev-dev]", ...args);

async function buildClientAssets() {
  await ensureDir("tmp");
  const workerBundle = await rollup({
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
  const workerCode: string = workerBundle.output[0].code;

  await Deno.run({
    cmd: [
      "deno",
      "bundle",
      "--unstable",
      "--no-check",
      "client-src/swdev-client.ts",
      "tmp/swdev-worker.js",
    ],
  }).status();

  const clientCode = await Deno.readTextFile("tmp/swdev-client.js");
  const clientCodeMin = (await minify(clientCode, { module: true }))
    .code as string;

  return {
    "__swdev-worker.js": workerCode,
    "__swdev-client.js": clientCodeMin,
  };
}

switch (task) {
  case "prebuild": {
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
        `https://deno.land/x/swdev${version}/swdev.ts`,
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
  default: {
    console.warn("Unkown command", task);
  }
}
