import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.0/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";
import type { RevalidateCommand } from "./types.ts";

const log = (...args: any) => console.log("[swdev:file_watcher]", ...args);

export function startFileWatcher(
  wss: WebSocketServer,
  opts: { cwd: string; target?: string }
) {
  const cwd = opts.cwd;
  const target = opts.target ?? ".";
  const watchTarget = path.join(cwd, target);

  wss.on("connection", async (socket: WebSocketClient) => {
    let timeoutId: number | null = null;
    let changedPaths = new Set();

    log("connection created");
    const watcher = Deno.watchFs(watchTarget);
    let closed = false;
    socket.on("close", () => {
      closed = true;
      log("connection closed");
    });
    // start file watch
    for await (const event of watcher) {
      if (closed) break;
      debounceEmit(socket, event.paths);
    }
    function debounceEmit(socket: WebSocketClient, paths: string[]) {
      for (const path of paths) {
        changedPaths.add(path.replace(watchTarget, ""));
      }
      timeoutId && clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        socket.send(
          JSON.stringify({
            type: "revalidate",
            paths: Array.from(changedPaths),
          } as RevalidateCommand)
        );
        changedPaths = new Set();
      }, 300);
    }
  });

  log("started");
}
