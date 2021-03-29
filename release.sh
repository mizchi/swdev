#!/usr/bin/env bash

version=$(deno eval "import {version} from './version.ts'; console.log(version)")

echo "Start release for $version"

deno run -A --unstable swdev-dev.ts prebuild
git tag $version
git push origin main --tags
