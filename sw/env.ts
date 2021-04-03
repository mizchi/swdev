export type ICache = {
  put(key: string, resp: Response): Promise<void>;
  delete(k: string): Promise<void>;
  match(req: Request): Promise<Response | undefined>;
};

export type ICaches = {
  open(version: string): Promise<ICache>;
};

export type Env = {
  caches: ICaches;
  load(request: Request): Promise<string>;
};

// mocks
export type FetchEvent = {
  request: Request;
  respondWith(promise: Promise<any>): void;
};

export const CACHE_VERSION = "v1";

class CacheMock implements ICache {
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
class CachesMock implements ICaches {
  _caches: { [k: string]: CacheMock } = {};
  async open(v: string) {
    if (this._caches[v]) {
      return this._caches[v];
    }
    return (this._caches[v] = new CacheMock());
  }
}
export const caches = new CachesMock();

export const log = (...args: any) => console.info("[swdev-worker]", ...args);
