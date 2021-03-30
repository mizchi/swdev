import { WebSocketServer, WebSocketClient } from "../deps.ts";
export type { WorkerApi, RemoteCall } from "./shared.ts";
import * as serverRpc from "./websocket_server_adapter.ts";
import * as clientRpc from "./websocket_adapter.ts";

const wss = new WebSocketServer(17777);

wss.on("connection", async (socket: WebSocketClient) => {
  console.log("server:connected");
  serverRpc.expose(socket, {
    async foo(a: number) {
      return { a };
    },
  });
});

const cli = new WebSocket("ws://localhost:17777/");
const api = clientRpc.wrap(cli);
cli.onopen = async (ev) => {
  const ret = await api.exec("foo", 1);
  console.log("user result", ret);
};
