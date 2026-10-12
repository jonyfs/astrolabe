#!/usr/bin/env sh
# Captures the surfaces in every flavor (064 #10): the overview and the Specs tab in mocha and
# latte, and one capture each in frappe, macchiato and colorblind. It changes the plugin's
# `flavor` option while it runs and puts the previous values back at the end, so run it on a
# machine you do not mind briefly changing. Requires tmux and an authenticated claude, as
# scene.sh does.
# Usage: scripts/capture/flavors.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
demo="$here/../../docs/demo"
plugin=astrolabe@astrolabe
before=$(claude plugin configure "$plugin" 2>/dev/null || true)
restore() {
  # The values shown above are `key: value` lines; a restore writes back only the flavor.
  old=$(printf '%s\n' "$before" | sed -n 's/^ *flavor: *//p' | head -1)
  printf '{"flavor":"%s"}' "${old:-mocha}" | claude plugin configure "$plugin" --values-stdin >/dev/null 2>&1 || true
}
trap restore EXIT

capture() { # flavor name keys...
  flavor=$1 name=$2
  shift 2
  printf '{"flavor":"%s"}' "$flavor" | claude plugin configure "$plugin" --values-stdin >/dev/null
  "$here/scene.sh" "$name" 180 40 "$demo" 30 "$@"
  node "$here/ansi-to-svg.mjs" "$here/../../docs/images/$name.ansi" "$here/../../docs/images/$name.svg" --from "^◆ "
}

for flavor in mocha latte; do
  capture "$flavor" "flavor-$flavor-overview"
  capture "$flavor" "flavor-$flavor-specs" "/astrolabe" Enter 3
done
for flavor in frappe macchiato colorblind; do
  capture "$flavor" "flavor-$flavor-overview"
done
