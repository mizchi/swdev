#!/usr/bin/env sh
deno run -A --unstable swdev-dev.ts pre-release
git tag 0.2.2
git push origin main --tags