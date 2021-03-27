# SWDEV

Runtime transfome by Service Worker and Deno(PoC).

## Concepts

- Transform and cache in service-worker (`typescript` and `svelte`)
- Cache bursting by file change event
- Safe file read / write by `deno` permissions
- Use deno semantics in frontend
- Bundle for production

## Install

```
$ deno install -qAf --unstable https://deno.land/x/swdev@0.1.1/swdev.ts

$ swdev init swdev-app
$ cd swdev-app
$ swdev serve
```

## Develop

```
$ swdev init myapp
$ cd myapp
$ swdev serve
```

open http://localhost:7777

_CAUTION_: port:7777 register service-worker. Unregister service-worker after develop.

## Release

```
## Build entry point
$ swdev build main.tsx #=> main.bundle.js

## Deploy assets
# netlify deploy --prod -d .
```

## TODO

- [ ] Self update `swdev update`
- [ ] Minify assets
- [ ] Generate importmaps
- [ ] ESM Cache bursting
- [ ] Plugin system
- [ ] Inline Editor
- [ ] Extract rollup-deno-plugin

## LICENSE

MIT
