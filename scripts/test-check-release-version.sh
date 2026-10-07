#!/usr/bin/env sh
# Tests scripts/check-release-version.sh against a throwaway plugin.json.
set -u
cd "$(dirname "$0")/.."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/.claude-plugin"
printf '{\n  "name": "x",\n  "version": "0.6.0",\n  "description": "x"\n}\n' > "$work/.claude-plugin/plugin.json"
failures=0
check() { # expected-exit tag expected-text
  out=$(PLUGIN_JSON="$work/.claude-plugin/plugin.json" sh scripts/check-release-version.sh "$2" 2>&1)
  code=$?
  if [ "$code" != "$1" ] || ! printf '%s' "$out" | grep -qF "$3"; then
    echo "FAIL: $2 -> exit $code, output: $out (wanted exit $1 and '$3')"
    failures=$((failures + 1))
  else
    echo "ok: $2"
  fi
}
check 0 v0.6.0 "release v0.6.0 matches plugin.json"
check 1 v0.6.1 "tag v0.6.1 does not match plugin.json version 0.6.0"
check 1 0.6.0 "tag 0.6.0 is not vX.Y.Z"
check 1 v0.6 "tag v0.6 is not vX.Y.Z"
[ "$failures" -eq 0 ] || exit 1
