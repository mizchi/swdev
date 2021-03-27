import { parse } from "https://deno.land/std@0.90.0/flags/mod.ts";

const args = parse(Deno.args);
const [task, second] = args._ as string[];

switch (task) {
  case "init": {
    const { initAssets } = await import("./commands.ts");
    initAssets(second ?? ".");
    break;
  }

  case "build": {
    const { bundle } = await import("./bundler.ts");
    bundle(second ?? ".");
    break;
  }

  case "serve": {
    const port = 7777;
    const process = Deno.run({
      cmd: [
        "deno",
        "run",
        "--allow-net",
        `--allow-read=${Deno.cwd()}`,
        "https://deno.land/x/swdev/server.ts",
        // "server.ts",
        second ?? ".",
        "-p",
        port.toString(),
      ],
      stdout: "piped",
      stderr: "piped",
    });

    console.log(`[swdev:asset-server] http://localhost:${port}`);
    console.log(`[swdev:ws] http://localhost:17777`);

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
