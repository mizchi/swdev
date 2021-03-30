import { WebSocketClient } from "../deps.ts";
import { createExpose, createWrap, Adapter } from "./shared.ts";
export type { WorkerApi, RemoteCall } from "./shared.ts";

const adapter: Adapter<WebSocketClient> = [
  // emit
  (ctx, arg) => {
    ctx.send(JSON.stringify({ data: arg }));
  },
  // listen
  (ctx, handler) => {
    ctx.on("message", (data) => {
      try {
        const parsed = JSON.parse(data);
        handler({
          data: parsed,
        });
      } catch (err) {
        console.error("server:parse-error", err);
      }
    });
  },
  // terminate
  async (ctx) => ctx.close(0),
];

export const expose = createExpose(adapter);
export const wrap = createWrap(adapter);
