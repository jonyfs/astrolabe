---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: Lean session state and the 0.8.1 release

**Created**: 2026-10-07 · **Source**: pre-submission audit of `main` after v0.8.0

## Problem

`astrolabe.speckit` held the derived state and the session memo together, and the memo kept
the full text of every `spec.md` and `tasks.md` plus the whole constitution: about 100 KB in
this repository (8 features), over 500 KB in a 40-feature project. Every Bash, Agent, Edit,
Write and Skill call and every turn end rewrote it, and every band, hint, spinner and pane
redraw read it (the spinner redraws continuously during a turn). That breaks the spirit of
Principle XII.

## Requirements

- **FR-001**: The memo MUST store compacted inputs only: for `spec.md`, its front matter block and
  whether it holds `[NEEDS CLARIFICATION`; for `tasks.md`, the task lines alone; for the
  constitution, a stand-in that classifies the same. Derived state MUST be identical to deriving
  from the full files.
- **FR-002**: Drawing sites MUST read only a small key (`astrolabe.speckit`: the derived state).
  The memo MUST live in its own key (`astrolabe.memo`) that no `ui.render` hook reads. The state
  gains what the spinner and the pane needed from the memo: whether the turn worked on the active
  feature, and the active feature's tasks.
- **FR-003**: An update that changes nothing MUST NOT write.
- **FR-004**: Release 0.8.1 with #9 to #11 and this change: `plugin.json`, `hooks/core/version.ts`,
  descriptions updated to what the mod does now, README order (Usage governance before
  Troubleshooting).

## Tasks

- [ ] T001 Failing tests: compacted snapshot derives the same state for every fixture; compact sizes; renders read no memo key; a repeated Bash call writes nothing
- [ ] T002 `compactFiles` / `compactConstitution` in `hooks/core/compact.ts`, applied where the memo stores files
- [ ] T003 Split `astrolabe.speckit` (state) and `astrolabe.memo` (memo) in `types/index.d.ts`, `hooks/register.tsx` and the test helpers; add `isWorkingOnActive` and `activeTasks` to the state
- [ ] T004 Skip no-op writes in `guarded`
- [ ] T005 Version 0.8.1, descriptions, README order; validate, tests, tsc, release script
