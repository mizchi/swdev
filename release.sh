#!/usr/bin/env sh
deno run -A --unstable pre_release.ts
git tag 0.1.2
git push origin main --tags