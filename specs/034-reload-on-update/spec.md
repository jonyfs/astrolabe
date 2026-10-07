---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Reload when a new version lands on disk

**Created**: 2026-10-07 · **Source**: the owner asked why Astrolabe did not update the mod when it was updated

## Problem

An install read from a folder (a local clone, `claude plugin update`, the git hooks) changes
the code on disk, but the running session keeps the module it loaded at start. The new version
only runs after `/reload-plugins` or a new session, and nothing says so.

## Requirements

- **FR-001**: After each main turn, Astrolabe MUST read the version in its own
  `.claude-plugin/plugin.json` and compare it with the version it runs.
- **FR-002**: When they differ, it MUST toast once and run `/reload-plugins`, which Claude Code
  queues until the session is idle. The `autoReload` option (default on) turns the reload off;
  then the toast says to run the command.
- **FR-003**: It MUST reload at most once per version found on disk, so a mismatch that a reload
  cannot fix never loops.

## Tasks

- [x] T001 Failing tests in `tests/integration/reload-on-update.test.ts`
- [x] T002 `checkDiskVersion` in `hooks/register.tsx`, the `autoReload` option, i18n
- [x] T003 README, version 0.22.0
