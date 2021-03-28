#!/usr/bin/env sh
deno run -A --unstable __dev.ts pre-release
git tag 0.1.3
git push origin main --tags