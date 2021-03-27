import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.0/mod.ts";

const cwd = Deno.cwd();
const target = Deno.args[0];
const watchTarget = cwd + "/" + target;

const wss = new WebSocketServer(17777);
wss.on("connection", async (socket: WebSocketClient) => {
  console.log("new connection");
  const watcher = Deno.watchFs(watchTarget);
  let closed = false;
  socket.on("close", () => {
    closed = true;
    console.log("close");
  });
  for await (const event of watcher) {
    if (closed) break;
    debounceEmit(socket, event.paths);
  }
});

let id: any = null;
let bufferedPaths = new Set();
function debounceEmit(socket: WebSocketClient, paths: string[]) {
  for (const path of paths) {
    bufferedPaths.add(path.replace(watchTarget, ""));
  }
  id && clearTimeout(id);
  id = setTimeout(() => {
    id = null;
    socket.send(JSON.stringify(Array.from(bufferedPaths)));
    bufferedPaths = new Set();
  }, 300);
}

import { main } from "./static-server.ts";
main();
