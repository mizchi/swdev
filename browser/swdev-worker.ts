import { createTransformHandler } from "../sw/handleWithTransform.ts";
import { FetchEvent, Env } from "../sw/env.ts";
import { createInternalHandler } from "../sw/handleInternal.ts";

declare var self: any;

const getStore = () => self.caches.open("v1");

async function load(request: Request) {
  return fetch(request).then((res) => res.text());
}

const env: Env = { getStore, load };

const handleInternal = createInternalHandler(env);
const handleWithTransform = createTransformHandler(env);

self.addEventListener("install", (ev: any) => ev.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (ev: any) =>
  ev.waitUntil(self.clients.claim())
);

const TARGET_EXTENSIONS = [".ts", ".tsx", ".svelte"];
self.addEventListener("fetch", (event: FetchEvent) => {
  const [url, _hash] = event.request.url.split("?");
  if (url.endsWith("/__swdev/revalidate")) {
    event.respondWith(handleInternal(event));
  } else if (TARGET_EXTENSIONS.some((ext) => url.endsWith(ext))) {
    event.respondWith(handleWithTransform(event));
  }
});
