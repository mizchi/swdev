import type { ServeArgs } from "./types.ts";
import { startStaticServer } from "./static_server.ts";
import { startFileWatcher } from "./file_watcher.ts";
import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.0/mod.ts";
import { parse } from "https://deno.land/std@0.90.0/flags/mod.ts";

export async function serve(args: ServeArgs, target: string) {
  const wss = new WebSocketServer(17777);
  await Promise.all([
    startFileWatcher(wss, { cwd: Deno.cwd(), target }),
    startStaticServer(args, target),
  ]);
}

if (import.meta.main) {
  const args = parse(Deno.args) as ServeArgs;
  const target = args._[0];
  serve(args, target);
}
