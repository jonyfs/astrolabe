#!/usr/bin/env sh
# Refreshes types/engine/claude-code.d.ts from the declarations Claude Code writes.
# Source, in order: the path given as $1, the copy the engine lays beside a loaded
# mod (.claude-plugin/types/claude-code/index.d.ts), or the newest bundled
# plugin-authoring skill under the system temp directory.
set -eu
cd "$(dirname "$0")/.."
src="${1:-}"
if [ -z "$src" ] && [ -f .claude-plugin/types/claude-code/index.d.ts ]; then
  src=.claude-plugin/types/claude-code/index.d.ts
fi
if [ -z "$src" ]; then
  src=$(ls -t "${TMPDIR:-/tmp}"/../../*/claude-*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts \
    /tmp/claude-*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts \
    /private/tmp/claude-*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts 2>/dev/null | head -n 1 || true)
fi
if [ -z "$src" ] || [ ! -f "$src" ]; then
  echo "sync-engine-types: no engine declarations found; load the plugin-authoring skill or pass a path" >&2
  exit 1
fi
mkdir -p types/engine
cp "$src" types/engine/claude-code.d.ts
echo "sync-engine-types: copied $(head -n 1 types/engine/claude-code.d.ts | sed 's#^// ##') from $src"
