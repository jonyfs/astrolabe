#!/usr/bin/env sh
# Refreshes vendor/statusline/ from the statusline repository (spec 070).
# Usage: scripts/sync-statusline.sh [ref] [source]
#   ref     a branch, tag or commit of the source repository (default: main)
#   source  a git URL or a local path (default: https://github.com/jonyfs/statusline.git)
# Copies bin/, src/, package.json and LICENSE and writes vendor/statusline/VERSION; it changes
# nothing else. It does not commit: the workflow (or you) reviews the diff.
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
rm -rf "$dest"
mkdir -p "$dest"
cp -R "$tmp/src/bin" "$tmp/src/src" "$tmp/src/package.json" "$tmp/src/LICENSE" "$dest/"
# Preview fixtures and the other harnesses' glue are not part of the footer.
rm -rf "$dest/src/preview"
printf '{\n  "commit": "%s",\n  "version": "%s",\n  "ref": "%s",\n  "source": "%s"\n}\n' "$commit" "$version" "$ref" "https://github.com/jonyfs/statusline" > "$dest/VERSION"
echo "vendor/statusline: $version @ $commit"
