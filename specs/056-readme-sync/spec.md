---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: README sync

**Created**: 2026-10-09 · **Source**: the plan review of every implemented spec found the README drifted from the plugin — its version line still says 0.8.1

Tasks run P1 first. Each becomes failing tests, then code, then a release.

## Tasks

- [x] T001 The README's version line states the plugin's current version, not 0.8.1 (P1)
- [x] T002 The README documents `footerLines` and `footerSeparator` with one example each, like the other options (P1)
- [x] T003 The README documents the band's behaviour from 042: the bar coloured by share left, the animated running ellipsis, the dim to one line after idle minutes (P1)
- [x] T004 `scripts/check-readme-sync.sh` fails when a `userConfig` key of `.claude-plugin/plugin.json` or a `/astrolabe` command is missing from the README; written red-green (it fails on the pre-fix README and passes after the fix); CI runs it on all three operating systems with `shell: bash` (P1)
- [x] T005 The README and the constitution's Principle II both name the guard (P2)
