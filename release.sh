#!/usr/bin/env sh
deno run -A --unstable pre_release.ts
git tag 0.0.1-alpha.8
git push origin main --tags