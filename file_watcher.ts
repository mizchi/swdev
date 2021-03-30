import {
  WebSocketClient,
  WebSocketServer,
  join,
  parse,
  expandGlob,
} from "./deps.ts";

import { expose } from "./rpc/websocket_server_adapter.ts";
import type { ServeArgs, RevalidateCommand } from "./types.ts";

const log = (...args: any) => console.log("[swdev:file_watcher]", ...args);

export function startFileWatcher(
  wss: WebSocketServer,
  opts: { cwd: string; target?: string }
) {
  const cwd = opts.cwd;
  const target = opts.target ?? ".";
  const watchTarget = join(cwd, target);

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
      } else if (cmd.type === "read-file") {
        const filepath = cmd.filepath as string;
        socket.send(JSON.stringify({ type: "read-files" }));
      }
    });
    socket.on("close", () => {
      closed = true;
      log("connection closed");
    });

    expose(socket, {
      async foo() {
        if (closed) return;
        return 1;
      },
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

if (import.meta.main) {
  const wss = new WebSocketServer(17777);
  const serverArgs = parse(Deno.args) as ServeArgs;
  const target = serverArgs._[0] ?? ".";
  // console.log(serverArgs, target);
  await startFileWatcher(wss, { cwd: Deno.cwd(), target });
}
