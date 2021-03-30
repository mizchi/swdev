import { createExpose, createWrap, Adapter } from "./shared.ts";

const adapter: Adapter<WebSocket> = [
  // emit
  (ctx, arg) => {
    ctx.send(JSON.stringify(arg));
  },
  // listen
  (ctx, handler) => {
    ctx.addEventListener("message", (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        handler(parsed);
      } catch (err) {
        console.error(err);
      }
    });
  },
  // terminate
  // @ts-ignore
  (ctx) => ctx.terminate(),
];

export type { WorkerApi, RemoteCall } from "./shared";
export const expose = createExpose(adapter);
export const wrap = createWrap(adapter);
