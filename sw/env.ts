export type IStore = {
  put(key: string, resp: Response): Promise<void>;
  delete(k: string): Promise<void>;
  match(req: Request): Promise<Response | undefined>;
};

export type Env = {
  getStore: () => Promise<IStore>;
  load(request: Request): Promise<string>;
};

// mocks
export type FetchEvent = {
  request: Request;
  respondWith(promise: Promise<any>): void;
};

export const log = (...args: any) => console.info("[swdev-worker]", ...args);
