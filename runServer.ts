import { startStaticServer } from "./static-server.ts";
import { startFileWatcher } from "./ws-server.ts";
import { WebSocketServer } from "https://deno.land/x/websocket@v0.1.0/mod.ts";

const wss = new WebSocketServer(17777);
startFileWatcher(wss, { cwd: Deno.cwd(), target: "." });
const target = Deno.args[0] ?? ".";

await Promise.all([
  startFileWatcher(wss, { cwd: Deno.cwd(), target }),
  startStaticServer(),
]);
