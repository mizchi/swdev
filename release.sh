#!/usr/bin/env sh
deno run -A pre-release.ts
git tag 0.0.1-alpha.1
git push origin main --tags