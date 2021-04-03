import { parse, expandGlob, minify, ensureDir } from "./deps.ts";
import { version } from "./version.ts";

const args = parse(Deno.args);
const [task, second] = args._ as string[];
const log = (...args: any) => console.log("[swdev-dev]", ...args);
// import pre from './prebuilt.ts'

async function buildClientAssets(opts: { client: boolean; worker: boolean }) {
  await ensureDir("tmp");
  let workerCode: string;
  if (opts.worker) {
    await Deno.run({
      cmd: [
        "deno",
        "bundle",
        "--unstable",
        "--no-check",
        "browser/swdev-worker.ts",
        "tmp/swdev-worker.js",
      ],
    }).status();
    const code = await Deno.readTextFile("tmp/swdev-worker.js");
    workerCode = (await minify(code, { module: true })).code as string;
    console.log("[dev]", "gen tmp/swdev-worker.js");
  } else {
    console.log("[dev]", "use cache tmp/swdev-worker.js");
    workerCode = await Deno.readTextFile("tmp/swdev-worker.js");
  }

  let clientCode: string;
  if (opts.client) {
    await Deno.run({
      cmd: [
        "deno",
        "bundle",
        "--unstable",
        "--no-check",
        "browser/swdev-client.ts",
        "tmp/swdev-client.js",
      ],
    }).status();

    const code = await Deno.readTextFile("tmp/swdev-client.js");
    clientCode = (await minify(code, { module: true })).code as string;
    await Deno.writeTextFile("tmp/swdev-client.js", clientCode);
    console.log("[dev]", "gen tmp/swdev-client.js");
  } else {
    console.log("[dev]", "use cache tmp/swdev-client.js");
    clientCode = await Deno.readTextFile("tmp/swdev-client.js");
  }

  return {
    "__swdev-worker.js": workerCode,
    "__swdev-client.js": clientCode,
  };
}

switch (task) {
  case "prebuild": {
    // initialize
    const prebuiltData: { [k: string]: string } = await buildClientAssets({
      client: args.client ?? false,
      worker: args.worker ?? false,
    });

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
        `https://deno.land/x/swdev@${version}/swdev.ts`,
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
