#!/usr/bin/env bash

version=$(deno eval "import {version} from './version.ts'; console.log(version)")

echo "Start release for $version"

rm -rf tmp
deno run -A --unstable swdev-dev.ts prebuild --client --worker
git tag $version
git push origin main --tags
