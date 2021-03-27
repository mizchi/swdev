# SWDEV

Runtime transfome by Service Worker PoC.

_DO NOT USE PRODUCTION_

## Requirements

- deno `v1.*`

## Develop

```
$ deno run --allow-net --allow-read server.ts www
```

Open `http://localhost:9999`

## Release

```
$ deno run swdev.ts bundle www/script/main.ts
```

## Add library

Edit `www/index.html` 's import map

## TODO

- [ ] CLI to setup
- [ ] ESM Cache bursting

## LICENSE

MIT
