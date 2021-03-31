import { WebSocketClient, WebSocketServer, join, parse } from "./deps.ts";
import { expose } from "./rpc/websocket_server_adapter.ts";
import { createApi } from "./server_api_impl.ts";
import type { ServeArgs, RevalidateCommand } from "./types.ts";

const log = (...args: any) => console.log("[swdev:file_watcher]", ...args);

export type ServerApiImpl = ReturnType<typeof createApi>;

export function startFileWatcher(
  wss: WebSocketServer,
  opts: { cwd: string; target?: string }
) {
  const cwd = opts.cwd;
  const target = opts.target ?? ".";
  const watchRoot = join(cwd, target);

  wss.on("connection", async (socket: WebSocketClient) => {
    let timeoutId: number | null = null;
    let changedPaths = new Set();

    log("connection created");
    const watcher = Deno.watchFs(watchRoot);
    let closed = false;

    socket.on("close", () => {
      closed = true;
      log("connection closed");
    });

    expose(socket, createApi(watchRoot));

    // start file watch
    for await (const event of watcher) {
      if (closed) break;
      debounceEmit(socket, event.paths);
    }
    function debounceEmit(socket: WebSocketClient, paths: string[]) {
      for (const path of paths) {
        changedPaths.add(path.replace(watchRoot, ""));
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
  startFileWatcher(wss, { cwd: Deno.cwd(), target });
}
