---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Fewer file calls at session start

**Created**: 2026-10-08 · **Source**: the 500-feature load test in spec 027

## Problem

Session start reads every feature: `spec.md`, `tasks.md`, whether `plan.md` exists, and the
`checklists/` folder, about four `$.fs` calls per feature. Without the engine, 500 features read and
derive in about half a second; through the test kit's `$.fs`, each call costs about 10 ms and the
same start takes about 20 s, past the 10 s hook budget.

## Requirements

- **FR-001**: One `fs.list` per feature folder MUST tell which files exist, so `plan.md` and
  `checklists/` cost no call of their own when absent.
- **FR-002**: A finished feature whose files have not changed since the session memo (by size and
  modification time from the listing) MUST NOT be read again.
- **FR-003**: Session start MUST read the active feature first and the rest on a timer, so the
  band draws within the budget however many features there are.

Status: FR-001 shipped in 0.35.0, from four calls per feature to three. FR-003 shipped in 0.36.0. FR-002 is dropped: the folder listing carries no modification times, and a stat per file costs as much as the read it would save.

## Tasks

- [x] T001 A load test through the engine: `tests/integration/staged-start.test.ts` (220 features)
- [x] T002a `fs.list` per folder: an absent `plan.md` or `checklists/` costs no call (0.35.0)
- [x] T002b Active feature first: past 150 features, the one feature.json or the branch names and the twenty newest are read at start, the rest in batches of 100 on timers, shown as `…` until read (0.36.0)
- [x] T002c Skip unchanged finished features: dropped, see Status
- [x] T003 README, version 0.36.0
