import { parse, ensureDir, join } from "./deps.ts";
import { version } from "./version.ts";

const args = parse(Deno.args);
const [task, second] = args._ as [string, string | undefined];

switch (task) {
  case "init": {
    const prebuilt = await import("./prebuilt.ts");
    const targetDir = join(Deno.cwd(), second ?? ".");
    await ensureDir(targetDir);
    for (const [fpath, content] of Object.entries(prebuilt.default)) {
      if (!fpath.startsWith("__swdev-")) {
        await Deno.writeTextFile(join(targetDir, fpath), content);
      }
    }
    break;
  }

  case "eject": {
    const target = second ?? ".";
    await Deno.remove(join(Deno.cwd(), target, "__swdev-client.js")).catch(
      () => 0
    );
    await Deno.remove(join(Deno.cwd(), target, "__swdev-worker.js")).catch(
      () => 0
    );
    const { updateSelf } = await import("./commands.ts");
    await updateSelf(second ?? ".");
    console.log("[swdev] asset updated");
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
      ? "serve.ts"
      : `https://deno.land/x/swdev@${version}/serve.ts`;
    const process = Deno.run({
      cmd: [
        "deno",
        "run",
        "--allow-net",
        `--allow-read=${Deno.cwd()}`,
        "--unstable",
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
