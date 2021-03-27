import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.0/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";

export function startFileWatcher(
  wss: WebSocketServer,
  opts: { cwd: string; target?: string }
) {
  const cwd = opts.cwd;
  const target = opts.target ?? ".";
  const watchTarget = path.join(cwd, target);

  wss.on("connection", async (socket: WebSocketClient) => {
    console.log("connection created");
    const watcher = Deno.watchFs(watchTarget);
    let closed = false;
    socket.on("close", () => {
      closed = true;
      console.log("connection closed");
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
  console.log("[swdev] ws-server strated");
}

if (import.meta.main) {
  const wss = new WebSocketServer(17777);
  startFileWatcher(wss, { cwd: Deno.cwd(), target: "." });
}
