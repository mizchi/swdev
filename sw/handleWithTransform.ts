import { transpileDefault } from "../swc_wasm/mod.ts";
import { rewriteWithRandomHash } from "../browser/cache_buster.ts";
import {
  compile as svelteCompile,
  preprocess,
} from "https://cdn.skypack.dev/svelte/compiler";
import hash from "https://cdn.esm.sh/string-hash";
import { Env } from "./env.ts";

type FetchEvent = {
  request: Request;
  respondWith(promise: Promise<any>): void;
};

export function createTransformHandler(env: Env) {
  return async (event: FetchEvent): Promise<Response> => {
    const [url, hash] = event.request.url.split("?");
    const useCache = !hash?.startsWith("nocache");
    if (useCache) {
      const store = await env.getStore();
      const matched = await store.match(new Request(url));
      if (matched) {
        const text = await matched.text();
        const newCode = rewriteWithRandomHash(text);
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
    const raw = await env.load(event.request);
    return await createNewResponseWithCache(env, url, raw, useCache);
  };
}

async function transform(url: string, code: string): Promise<string> {
  const newHash = hash(code);
  const header = `/* SWDEV-HASH:${newHash} */\n`;
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const result = await transpileDefault(code);
    return header + result.code;
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
  env: Env,
  url: string,
  newCode: string,
  saveCache: boolean = true
) {
  let output = await transform(url, newCode);
  if (!saveCache) {
    output = rewriteWithRandomHash(output);
  }
  const modifiedResponse = new Response(output, {
    // @ts-ignore
    // mode: "no-cors",
    headers: {
      "Content-Type": "text/javascript",
    },
  });
  if (saveCache) {
    const store = await env.getStore();
    await store.put(url, modifiedResponse.clone());
  }
  return modifiedResponse;
}

const tsPreprocess = () => {
  const script: any = async ({ content, filename }: any) => {
    const out = await transpileDefault(content);
    return { code: out.code };
  };
  return {
    script,
  };
};
