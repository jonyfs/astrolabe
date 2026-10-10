#!/usr/bin/env sh
# Fails when README.md is out of sync with the mod: the version line, every
# userConfig option in .claude-plugin/plugin.json, and every /astrolabe
# subcommand in the help text must appear in the README
# (Constitution Principle II). Usage: scripts/check-readme-sync.sh
# Self-test overrides: README_FILE, PLUGIN_JSON, REGISTER_TSX.
set -eu
readme="${README_FILE:-$(dirname "$0")/../README.md}"
manifest="${PLUGIN_JSON:-$(dirname "$0")/../.claude-plugin/plugin.json}"
help_source="${REGISTER_TSX:-$(dirname "$0")/../hooks/modules/help.ts}"
missing=0

# 1. The README's version line matches plugin.json.
plugin_version=$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest" | head -n 1)
if [ -z "$plugin_version" ]; then
  echo "no version found in $manifest" >&2
  exit 1
fi
readme_version=$(sed -n 's/.*\*\*Version \([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)\.\{0,1\}\*\*.*/\1/p' "$readme" | head -n 1)
if [ -z "$readme_version" ]; then
  echo "no '**Version X.Y.Z**' line found in $readme" >&2
  exit 1
fi
if [ "$readme_version" != "$plugin_version" ]; then
  echo "README says Version $readme_version but plugin.json says $plugin_version" >&2
  missing=1
fi

# 2. Every userConfig option appears in the README.
options=$(sed -n '/"userConfig"[[:space:]]*:[[:space:]]*{/,/^  }/p' "$manifest" | sed -n 's/^    "\([a-zA-Z][a-zA-Z0-9]*\)"[[:space:]]*:.*/\1/p')
if [ -z "$options" ]; then
  echo "no userConfig options found in $manifest" >&2
  exit 1
fi
for option in $options; do
  if ! grep -qF "$option" "$readme"; then
    echo "userConfig option '$option' is not documented in $readme" >&2
    missing=1
  fi
done

# 3. Every /astrolabe subcommand from the help text appears in the README.
if ! grep -qF '`/astrolabe`' "$readme"; then
  echo "/astrolabe itself is not documented in $readme" >&2
  missing=1
fi
subcommands=$(grep -o '`  /astrolabe [a-z][a-z]*' "$help_source" | sed 's/.* //')
if [ -z "$subcommands" ]; then
  echo "no /astrolabe subcommands found in the help text of $help_source" >&2
  exit 1
fi
for subcommand in $subcommands; do
  if ! grep -qF "/astrolabe $subcommand" "$readme"; then
    echo "/astrolabe subcommand '$subcommand' is not documented in $readme" >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "README.md is out of sync (Constitution Principle II)" >&2
  exit 1
fi
echo "README.md is in sync: version line, $plugin_version, $(printf '%s\n' $options | wc -l | tr -d ' ') options, $(printf '%s\n' $subcommands | wc -l | tr -d ' ') subcommands"
