---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Update notices without a shell, and a hide button

**Created**: 2026-10-07 · **Source**: pre-submission audit (`docs/reports/pre-submission-audit.md`)

## Problem

The daily update check ran `sh -c "$HOME/.claude/skills/gstack/bin/gstack-update-check"` for
everyone, including people without gstack, and an inline shell program is what the directory's
security review looks for. Update buttons could not be dismissed.

## Requirements

- **FR-001**: The gstack check MUST find the script from `HOME` (or `USERPROFILE`) through
  `$.env.get`, run it directly when it exists, and run nothing when it does not. No other
  environment variable is read.
- **FR-002**: The update row MUST end with a `hide` button that dismisses every update shown,
  remembered in `$.store` (`updates:hidden`) per item and version; an item comes back only when a
  newer version appears.
- **FR-003**: Version 0.9.0; README updated, including that `SPECIFY_FEATURE` is ignored for its
  real reason.

## Tasks

- [X] T001 Failing tests: no process without gstack; the script path from HOME; hide and the return of a newer version; no env read but HOME/USERPROFILE
- [X] T002 Implementation in `hooks/register.tsx` and `hooks/surfaces/band.tsx`
- [X] T003 README and version 0.9.0
