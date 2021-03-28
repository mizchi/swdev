#!/usr/bin/env sh
deno run -A --unstable __dev.ts pre-release
git tag 0.2.0
git push origin main --tags