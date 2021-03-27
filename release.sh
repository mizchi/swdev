#!/usr/bin/env sh
deno run -A --unstable pre-release.ts
git tag 0.0.1-alpha.4
git push origin main --tags