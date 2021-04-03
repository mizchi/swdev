import { RevalidateCommand } from "../types.ts";
import { FetchEvent, CACHE_VERSION, Env, log } from "./env.ts";

export function createInternalHandler(env: Env) {
  return async (event: FetchEvent): Promise<Response> => {
    const cmd: RevalidateCommand = await event.request.json();
    const cache = await env.caches.open(CACHE_VERSION);
    await Promise.all(
      cmd.paths.map(async (path: string) => {
        try {
          await cache.delete(path);
          log("revalidated", path);
        } catch (err) {
          log(err);
        }
      })
    );
    return new Response(event.request.url, {
      // @ts-ignore
      mode: "no-cors",
      status: 200,
    });
  };
}
