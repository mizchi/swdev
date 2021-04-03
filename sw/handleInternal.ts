import { RevalidateCommand } from "../types.ts";
import { FetchEvent, Env, log } from "./env.ts";

export function createInternalHandler(env: Env) {
  return async (event: FetchEvent): Promise<Response> => {
    const cmd: RevalidateCommand = await event.request.json();
    await Promise.all(
      cmd.paths.map(async (path: string) => {
        try {
          const store = await env.getStore();
          await store.delete(path);
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
