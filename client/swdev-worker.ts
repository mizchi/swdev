import type { RevalidateCommand } from "./../types.ts";

import type { Preprocessor } from "svelte/types/compiler/preprocess/types";
import {
  compile as svelteCompile,
  preprocess,
} from "https://cdn.skypack.dev/svelte/compiler";

import ts from "https://cdn.esm.sh/typescript";
import hash from "https://cdn.esm.sh/string-hash";

const CACHE_VERSION = "v1";
declare var self: any;
declare var caches: any;
declare var clients: any;

const log = (...args: any) => console.info("[swdev-worker]", ...args);

self.addEventListener("install", (ev: any) => ev.waitUntil(self.skipWaiting()));

self.addEventListener("activate", (ev: any) =>
  ev.waitUntil(self.clients.claim())
);

const TARGET_EXTENSIONS = [".ts", ".tsx", ".svelte"];

self.addEventListener("fetch", (event: FetchEvent) => {
  const [url, _hash] = event.request.url.split("?");
  if (url.endsWith("/__swdev/revalidate")) {
    // log("revalidate");
    event.respondWith(handleRevalidateRequest(event));
  }
  if (TARGET_EXTENSIONS.some((ext) => url.endsWith(ext))) {
    // log("handle with transform", event.request.url);
    event.respondWith(respondWithTransform(event));
  }
});

async function resolveContentByRequest(request: Request) {
  const res = await fetch(request);
  if (!res.ok) {
    throw new Error(`faild to fetch: ${request.url}`);
  }
  return res.text();
}

async function resolveContent(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`faild to fetch: ${url}`);
  }
  return res.text();
}

async function handleRevalidateRequest(event: FetchEvent): Promise<Response> {
  const cmd: RevalidateCommand = await event.request.json();
  const cache = await caches.open(CACHE_VERSION);
  await Promise.all(
    cmd.paths.map(async (path: string) => {
      try {
        await cache.delete(path);
        log("revalidated", path);
      } catch (err) {
        console.log(err);
      }
    })
  );
  return new Response(event.request.url, {
    // @ts-ignore
    mode: "no-cors",
    status: 200,
  });
}

async function transform(url: string, code: string): Promise<string> {
  const newHash = hash(code);
  const header = `/* SWDEV-HASH:${newHash} */\n`;
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const result = ts.transpile(code, {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
    });
    return header + result;
  } else if (url.endsWith(".svelte")) {
    const { code: preprocessed } = await preprocess(code, [tsPreprocess()], {
      filename: "$.tsx",
    });
    const compiled = svelteCompile(preprocessed, {
      css: false,
      hydratable: true,
    });
    return header + compiled.js.code;
  } else {
    throw new Error(`unknown extension: ${url}`);
  }
}

async function createNewResponseWithCache(
  url: string,
  newCode: string,
  saveCache: boolean = true
) {
  let output = await transform(url, newCode);
  if (!saveCache) {
    output = output.replace(
      /import\s+(.*)\s+from\s+['"](\..*)['"]/gi,
      `import $1 from "$2?nocache-${Math.random()}"`
    );
  }
  const modifiedResponse = new Response(output, {
    // @ts-ignore
    mode: "no-cors",
    headers: {
      "Content-Type": "text/javascript",
    },
  });
  if (saveCache) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(url, modifiedResponse.clone());
  }
  return modifiedResponse;
}

async function respondWithTransform(event: FetchEvent): Promise<Response> {
  const [url, hash] = event.request.url.split("?");
  const useCache = !hash.startsWith("nocache");
  if (useCache) {
    const cache = await caches.open(CACHE_VERSION);
    const matched = await cache.match(new Request(url));
    if (matched) {
      const text = await matched.text();
      const newCode = text.replace(
        /import\s+(.*)\s+from\s+['"](\..*)['"]/gi,
        `import $1 from "$2?${Math.random()}"`
      );
      // console.log("[swdev:debug]", newCode);
      return new Response(newCode, {
        // @ts-ignore
        mode: "no-cors",
        status: 200,
        headers: {
          "Content-Type": "text/javascript",
        },
      });
    }
  }
  const raw = await resolveContentByRequest(event.request);
  return createNewResponseWithCache(url, raw, useCache);
}

const tsPreprocess = () => {
  const script: Preprocessor = async ({ content, filename }: any) => {
    const out = ts.transpile(content, {
      fileName: filename ?? "/$$.tsx",
      target: ts.ScriptTarget.ES2019,
    });
    return { code: out };
  };
  return {
    script,
  };
};
