#!/usr/bin/env sh
# Downloads the TypeScript declarations Claude Code writes for mods, for the type check only.
# They are not part of the plugin: they live as an asset of this repository's
# `engine-types-<version>` pre-release. Usage: scripts/fetch-engine-types.sh [version]
set -eu
cd "$(dirname "$0")/.."
version="${1:-2.1.292}"
url="https://github.com/jonyfs/astrolabe/releases/download/engine-types-$version/claude-code.d.ts"
mkdir -p types/engine
curl -fsSL --retry 3 -o types/engine/claude-code.d.ts.part "$url"
if ! head -n 1 types/engine/claude-code.d.ts.part | grep -q "Written by Claude Code $version\."; then
  echo "fetch-engine-types: $url is not the declarations of Claude Code $version" >&2
  exit 1
fi
mv types/engine/claude-code.d.ts.part types/engine/claude-code.d.ts
echo "fetch-engine-types: types/engine/claude-code.d.ts for Claude Code $version"
