import { parse } from "https://deno.land/std@0.90.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";

const args = parse(Deno.args);
const [task, second] = args._ as string[];

switch (task) {
  case "init": {
    const { initAssets } = await import("./commands.ts");
    initAssets(second ?? ".");
    break;
  }

  case "update": {
    const target = second ?? ".";
    await Deno.remove(path.join(Deno.cwd(), target, "__swdev-client.js")).catch(
      () => 0
    );
    await Deno.remove(path.join(Deno.cwd(), target, "__swdev-worker.js")).catch(
      () => 0
    );
    const { initAssets } = await import("./commands.ts");
    initAssets(second ?? ".");
    break;
  }

  case "build": {
    const { bundle } = await import("./bundler.ts");
    bundle(second ?? "main.tsx");
    break;
  }

  case "serve": {
    const port = 7777;
    const runner = args.local
      ? "run_server.ts"
      : "https://deno.land/x/swdev/run_server.ts";
    const process = Deno.run({
      cmd: [
        "deno",
        "run",
        "--allow-net",
        `--allow-read=${Deno.cwd()}`,
        runner,
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
    break;
  }
}
