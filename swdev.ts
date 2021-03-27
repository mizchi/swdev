const [task, second] = Deno.args;

switch (task) {
  case "pre-release": {
    const { prebuild } = await import("./setup.ts");
    prebuild("prebuilt");
    break;
  }

  case "init": {
    const { buildSwdevAssets } = await import("./setup.ts");
    buildSwdevAssets(second);
    break;
  }

  case "bundle": {
    // TODO
    const { bundle } = await import("./setup.ts");
    bundle(second);
    break;
  }

  case "serve": {
    const process = Deno.run({
      cmd: [
        "deno",
        "run",
        "--allow-net",
        `--allow-read=${Deno.cwd()}`,
        "server.ts",
        second,
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
    break;
  }
}
