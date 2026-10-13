#!/usr/bin/env sh
# Refreshes vendor/statusline/ from the statusline repository (specs 070 and 081).
# Usage: scripts/sync-statusline.sh [ref] [source]
#   ref     a branch, tag or commit of the source repository (default: main)
#   source  a git URL or a local path (default: https://github.com/jonyfs/statusline.git)
# Copies the renderer, package.json and LICENSE, the shared host fixtures and their environment
# (fixtures/host/, scripts/host-fixtures.js) when the source has them, and writes
# vendor/statusline/VERSION. The renderer is the render-only build when the source can make one
# (scripts/build-render-only.js, statusline 1.58.0), and bin/ and src/ otherwise. It changes nothing
# else and does not commit: the workflow (or you) reviews the diff.
set -eu
ref=${1:-main}
source=${2:-https://github.com/jonyfs/statusline.git}
here=$(cd "$(dirname "$0")/.." && pwd)
dest="$here/vendor/statusline"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git clone --quiet "$source" "$tmp/src"
git -C "$tmp/src" checkout --quiet "$ref"
commit=$(git -C "$tmp/src" rev-parse HEAD)
version=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version)' "$tmp/src/package.json")
from="$tmp/src"
build=bin-and-src
if [ -f "$tmp/src/scripts/build-render-only.js" ]; then
  (cd "$tmp/src" && node scripts/build-render-only.js "$tmp/render-only" >/dev/null)
  from="$tmp/render-only"
  build=render-only
fi
rm -rf "$dest"
mkdir -p "$dest"
cp -R "$from/bin" "$from/src" "$from/package.json" "$dest/"
cp "$tmp/src/LICENSE" "$dest/"
# Preview fixtures and the other harnesses' glue are not part of the footer.
rm -rf "$dest/src/preview"
# The shared fixtures a host checks its copy against (statusline spec 060).
if [ -d "$tmp/src/fixtures/host" ] && [ -f "$tmp/src/scripts/host-fixtures.js" ]; then
  mkdir -p "$dest/fixtures" "$dest/scripts"
  cp -R "$tmp/src/fixtures/host" "$dest/fixtures/host"
  cp "$tmp/src/scripts/host-fixtures.js" "$dest/scripts/host-fixtures.js"
fi
printf '{\n  "commit": "%s",\n  "version": "%s",\n  "ref": "%s",\n  "source": "%s"\n}\n' "$commit" "$version" "$ref" "https://github.com/jonyfs/statusline" > "$dest/VERSION"
echo "vendor/statusline: $version @ $commit ($build)"
