#!/usr/bin/env sh
# Tests scripts/check-readme-sync.sh against throwaway fixtures.
set -u
cd "$(dirname "$0")/.."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/.claude-plugin"
printf '{\n  "name": "x",\n  "version": "0.6.0",\n  "userConfig": {\n    "preset": {\n      "type": "string"\n    },\n    "flavor": {\n      "type": "string"\n    }\n  }\n}\n' > "$work/.claude-plugin/plugin.json"
printf '%s\n' 'const help = [' '  `  /astrolabe help        t`,' '  `  /astrolabe doctor      t`,' ']' > "$work/register.tsx"
printf '%s\n' '# Readme' '' '> **Version 0.6.0.** Every option: preset, flavor. Try `/astrolabe` and `/astrolabe help` or `/astrolabe doctor`.' > "$work/README.md"
printf '%s\n' '# Readme' '' '> **Version 0.5.0.** Only preset here. Try `/astrolabe`.' > "$work/stale.md"
failures=0
check() { # expected-exit tag expected-text
  out=$(README_FILE="${README:-$work/README.md}" PLUGIN_JSON="$work/.claude-plugin/plugin.json" REGISTER_TSX="$work/register.tsx" sh scripts/check-readme-sync.sh 2>&1)
  code=$?
  if [ "$code" != "$1" ] || ! printf '%s' "$out" | grep -qF "$3"; then
    echo "FAIL: $2 -> exit $code, output: $out (wanted exit $1 and '$3')"
    failures=$((failures + 1))
  else
    echo "ok: $2"
  fi
}
check 0 in-sync "README.md is in sync"
README="$work/stale.md" check 1 stale-version "README says Version 0.5.0 but plugin.json says 0.6.0"
README="$work/stale.md" check 1 missing-option "userConfig option 'flavor' is not documented"
README="$work/stale.md" check 1 missing-subcommand "/astrolabe subcommand 'doctor' is not documented"
[ "$failures" -eq 0 ] || exit 1
