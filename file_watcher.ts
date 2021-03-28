import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.0/mod.ts";
import * as path from "https://deno.land/std@0.91.0/path/mod.ts";
import type { RevalidateCommand } from "./types.ts";

import { expandGlob } from "https://deno.land/std@0.91.0/fs/mod.ts";

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
    socket.on("message", async (message) => {
      const cmd = JSON.parse(message);
      if (cmd.type === "request-files") {
        const files: string[] = [];
        for await (const file of expandGlob(watchTarget + "/**/*")) {
          if (file.isFile && !file.path.startsWith("__swdev")) {
            files.push(file.path.replace(watchTarget, ""));
          }
        }
        socket.send(JSON.stringify({ type: "files", files }));
      }
    });
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
