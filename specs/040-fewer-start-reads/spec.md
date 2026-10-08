---
track: quick # quick | full
status: active # active | done | abandoned
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

Status: FR-001 shipped in 0.35.0, from four calls per feature to three. FR-002 and FR-003 stay open.

## Tasks

- [ ] T001 A load test through the engine with 500 features, under the budget
- [x] T002a `fs.list` per folder: an absent `plan.md` or `checklists/` costs no call (0.35.0)
- [ ] T002b Skip unchanged finished features; active feature first (needs modification times the listing does not carry)
- [ ] T003 README, version
