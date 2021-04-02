# SWDEV

Runtime transfome by Service Worker and Deno(PoC).

## How to use

```bash
# install
$ deno install -qAf --unstable https://deno.land/x/swdev/swdev.ts

$ swdev init myapp
$ cd myapp
$ swdev serve
```

open http://localhost:7777

_CAUTION_: port:7777 register service-worker. Unregister service-worker after develop.

## How to develop

```bash
$ deno run -A --unstable swdev-dev.ts prebuild --client --worker # build __swdev-client and __swdev-server
$ deno run -A --unstable serve.ts examples/react --local # run
```

## Concepts

- Transform and cache in service-worker (`typescript` and `svelte`)
- Cache bursting by file change event
- Safe file read / write by `deno` permissions
- Use deno semantics in frontend
- Edit itself in browser
- Bundle for production

## Install

```
$ swdev init swdev-app
$ cd swdev-app
$ swdev serve
```

## Experimental Read/Write via websocket`

Run with `--allow-write` flag.

`$ swdev serve --allow-write`

```ts
// declare to touch
declare const DenoProxy: {
  exec: any;
};

// READ
console.log(await DenoProxy.exec("readTextFile", "index.html"));
// WRITE: need --allow-write
await DenoProxy.exec("writeTextFile", "foo.ts", "export default 1;");
```

These features are provided by `/__swdev_client.js`

## Experimental Command Run`

Run with `--allow-run` flag.

`$ swdev serve --allow-run`

```ts
// declare to touch
declare const DenoProxy: {
  exec: any;
};

// RUN commands
await DenoProxy.exec("run", ["ls", "-al"]);
```

## Release build

```bash
## Build entry point
$ swdev build #=> main.bundle.js

## Deploy assets
# netlify deploy --prod -d .
```

## LICENSE

MIT
