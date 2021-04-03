import { createTransformHandler } from "../sw/handleWithTransform.ts";
import { FetchEvent, Env, IStore } from "../sw/env.ts";
import { createInternalHandler } from "../sw/handleInternal.ts";
import { createHandleStatic } from "../sw/handleStatic.ts";

declare var self: any;

async function load(_request: Request) {
  // TODO: implement it!
  return "export default 1";
}

class DenoDeployStore implements IStore {
  private _data: { [k: string]: Response } = {};
  async match(request: Request) {
    for (const [k, v] of Object.entries(this._data)) {
      if (k === request.url) {
        return v.clone();
      }
    }
  }
  async put(k: string, request: Response) {
    this._data[k] = request.clone();
  }
  async delete(k: string) {
    delete this._data[k];
  }
}

let _store: any;
async function getStore(): Promise<IStore> {
  return (_store ??= new DenoDeployStore());
}

const env: Env = { getStore, load };
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
