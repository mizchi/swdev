import { createTransformHandler } from "./handleWithTransform.ts";
import { FetchEvent, caches, Env } from "./env.ts";
import { createInternalHandler } from "./handleInternal.ts";
import { createHandleStatic } from "./handleStatic.ts";

declare var self: any;

async function load(_request: Request) {
  return "export default 1";
}

const env: Env = { caches, load };
const handleInternal = createInternalHandler(env);
const handleWithTransform = createTransformHandler(env);
const handleStatic = createHandleStatic(env);

const TARGET_EXTENSIONS = [".ts", ".tsx", ".svelte"];

self.addEventListener("fetch", (event: FetchEvent) => {
  const [url, _hash] = event.request.url.split("?");
  if (url.endsWith("/__swdev/revalidate")) {
    event.respondWith(handleInternal(event));
  } else if (TARGET_EXTENSIONS.some((ext) => url.endsWith(ext))) {
    event.respondWith(handleWithTransform(event));
  } else {
    event.respondWith(handleStatic(event));
  }
});
