---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Keep the engine declarations out of the plugin

**Created**: 2026-10-07 · **Source**: pre-submission audit (`docs/reports/pre-submission-audit.md`)

## Problem

`types/engine/claude-code.d.ts` (789 KB, written by Claude Code) was committed so CI could type
check. The repository is the plugin folder, so every install shipped it, it was the only file
the directory checklist holds for a reviewer (over 256 KiB), and it redistributed generated
Anthropic declarations under this repository's license.

## Requirements

- **FR-001**: The file MUST NOT be tracked; `types/engine/` is ignored.
- **FR-002**: `scripts/fetch-engine-types.sh` MUST download the declarations for the pinned engine
  version from the `engine-types-<version>` pre-release of this repository and check the first
  line names that version.
- **FR-003**: CI and the release workflow MUST fetch them before `tsc`.
- **FR-004**: `scripts/sync-engine-types.sh` MUST say how to publish declarations for a new engine
  version; the README's Development section MUST describe both scripts.

## Tasks

- [X] T001 Fetch script, ignore rule, untrack the file
- [X] T002 Workflows fetch before the type check
- [X] T003 Sync script and README
- [X] T004 Validate, tests, tsc after a fresh fetch
