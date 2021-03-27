import { startStaticServer } from "./static_server.ts";
import { startFileWatcher } from "./file_watcher.ts";
import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.0/mod.ts";

const wss = new WebSocketServer(17777);
const target = Deno.args[0] ?? ".";

await Promise.all([
  startFileWatcher(wss, { cwd: Deno.cwd(), target }),
  startStaticServer(),
]);
