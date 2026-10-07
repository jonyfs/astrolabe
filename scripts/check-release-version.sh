#!/usr/bin/env sh
# Fails unless a release tag (vX.Y.Z) equals the version in .claude-plugin/plugin.json
# (Constitution Principle XIV). Usage: scripts/check-release-version.sh v0.6.0
set -eu
tag="${1:-}"
manifest="${PLUGIN_JSON:-$(dirname "$0")/../.claude-plugin/plugin.json}"
case "$tag" in
  v[0-9]*.[0-9]*.[0-9]*) ;;
  *) echo "tag $tag is not vX.Y.Z" >&2; exit 1 ;;
esac
if ! printf '%s' "${tag#v}" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "tag $tag is not vX.Y.Z" >&2
  exit 1
fi
version=$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest" | head -n 1)
if [ -z "$version" ]; then
  echo "no version found in $manifest" >&2
  exit 1
fi
if [ "${tag#v}" != "$version" ]; then
  echo "tag $tag does not match plugin.json version $version" >&2
  exit 1
fi
code_file="${VERSION_TS:-$(dirname "$0")/../hooks/core/version.ts}"
code_version=$(sed -n "s/^export const VERSION = '\\([^']*\\)'.*/\\1/p" "$code_file" | head -n 1)
if [ "$code_version" != "$version" ]; then
  echo "hooks/core/version.ts says $code_version but plugin.json says $version" >&2
  exit 1
fi
echo "release $tag matches plugin.json"
