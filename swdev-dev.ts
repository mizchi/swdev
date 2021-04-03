import { parse, expandGlob, minify, ensureDir } from "./deps.ts";
import { version } from "./version.ts";

const args = parse(Deno.args);
const [task] = args._ as string[];
const log = (...args: any) => console.log("[swdev-dev]", ...args);

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
    workerCode = await Deno.readTextFile("tmp/swdev-worker.js");
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

    clientCode = await Deno.readTextFile("tmp/swdev-client.js");
    await Deno.writeTextFile("tmp/swdev-client.js", clientCode);
    console.log("[dev]", "gen tmp/swdev-client.js");
  } else {
    console.log("[dev]", "use cache tmp/swdev-client.js");
    clientCode = await Deno.readTextFile("tmp/swdev-client.js");
  }

  return {
    "__swdev-worker.js": (await minify(workerCode, { module: true }))
      .code as string,
    "__swdev-client.js": (await minify(clientCode, { module: true }))
      .code as string,
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
