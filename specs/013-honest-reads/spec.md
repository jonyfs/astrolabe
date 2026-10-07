---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Unreadable files and a per-session phase baseline

**Created**: 2026-10-07 · **Source**: pre-submission audit (`docs/reports/pre-submission-audit.md`), items left from the 001 and 005 reviews

## Problem

A `spec.md`, `tasks.md` or constitution that exists but cannot be read (permissions, a lock
held by another program) counted as missing, so a feature could jump back to `specify` or lose
its progress for a turn. The phase-toast baseline lived in `$.store` under `baseline:<root>`, so
two sessions on one project overwrote each other's baseline and could hide a toast. The first
reconcile of every session only records the baseline, so the cross-session copy did nothing
useful.

## Requirements

- **FR-001**: A read that fails for a file that still exists MUST NOT count as missing. The last
  text read for it is kept (feature files and the constitution), and the feature is marked with
  the file's name.
- **FR-002**: The `/astrolabe` pane MUST say `! NNN: <file> exists but could not be read` while
  the mark is on. A marked feature is read again every turn, active or not, and a successful
  read clears the mark.
- **FR-003**: The phase baseline MUST live in the session memo, not `$.store`; with toasts on,
  `$.store` is never written by a reconcile.
- **FR-004**: Version 0.9.1; README and audit report updated.

## Tasks

- [X] T001 Failing tests: unreadable vs missing in `readSnapshot`, the kept text, the constitution, the pane row, a whole turn with denied reads, toasts with a stale stored baseline, an empty `$.store`
- [X] T002 `readResult` in `hooks/io/fs-port.ts`; `readFeature`/`readSnapshot` keep the last text; warnings in `hooks/core/phase.ts` and `hooks/core/pane.ts`
- [X] T003 Baseline moved to `SessionMemo.baseline` in `hooks/register.tsx`
- [X] T004 README, audit report, version 0.9.1
