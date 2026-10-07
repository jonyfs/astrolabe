#!/usr/bin/env sh
# Captures one live Claude Code screen with the installed Astrolabe into docs/images/.
# Usage: scripts/capture/scene.sh <name> <columns> <rows> <dir> <wait-seconds> [keys...]
# Each extra argument is sent with `tmux send-keys` and followed by a 2 s pause; a bare
# number N waits N seconds instead; `keys:A B` sends A and B in one call (a chord such as
# ctrl+x tab). Requires tmux and an authenticated claude.
set -eu
name=$1 cols=$2 rows=$3 dir=$4 wait=$5
shift 5
here=$(cd "$(dirname "$0")" && pwd)
out="$here/../../docs/images"
mkdir -p "$out"
session="astro-$name"
tmux kill-session -t "$session" 2>/dev/null || true
# Inside tmux, Claude Code 2.1.292 draws with 256 colors, so the images show the nearest
# 256-color match of each Catppuccin hex value.
tmux new-session -d -s "$session" -x "$cols" -y "$rows" -c "$dir" claude
sleep "$wait"
for key in "$@"; do
  case "$key" in
    keys:*) # shellcheck disable=SC2086
      tmux send-keys -t "$session" ${key#keys:}; sleep 2 ;;
    *[!0-9]*) tmux send-keys -t "$session" "$key"; sleep 2 ;;
    *) sleep "$key" ;;
  esac
done
tmux capture-pane -e -p -t "$session" > "$out/$name.ansi"
tmux kill-session -t "$session"
echo "captured $out/$name.ansi"
