---
description: "Task list for 005-toasts-drift"
---

# Tasks: Phase toasts and the drift alarm

**Tests**: required (Principle VI).

## Phase 1: Setup

- [X] T001 Bump `plugin.json` to `0.5.0`; extend the memo in `types/index.d.ts` (`window`, `toasted`, `baselined`) and `emptyMemo`; answer `$.store` and record toasts in `tests/helpers/fake-fs.ts` (`mock.store`, `ui.toast`); allow only `baseline:` store keys in `tests/integration/no-writes.test.ts`

## Phase 2: User Story 1 - phase toasts (P1)

- [X] T002 [US1] Failing tests in `tests/core/phase-toast.test.ts` for FR-001 (first reconcile silent, later phase toasts once, backwards silent, abandoned silent, texts from contracts/toasts.md)
- [X] T003 [US1] Implement `hooks/core/phase-toast.ts` until T002 passes
- [X] T004 [US1] Failing integration tests in `tests/integration/toasts.test.ts`: with `full`, a stored baseline and a turn that writes `plan.md` toast once; `compact` and `minimal` silent; a skill hint alone silent
- [X] T005 [US1] Wire the baseline and phase toasts into `hooks/register.tsx` until T004 passes

## Phase 3: User Story 2 - drift (P1)

- [X] T006 [US2] Failing tests in `tests/core/drift.test.ts`: `newlyTicked`, `namedPaths`, `detectDrift` for every scenario of US2
- [X] T007 [US2] Implement `hooks/core/drift.ts` until T006 passes
- [X] T008 [US2] Failing integration tests in `tests/integration/toasts.test.ts`: tick with no edit toasts; with a code edit no toast; named file missing toasts the path; Bash or Agent in the window silent; external tick silent; `minimal` silent
- [X] T009 [US2] Record code edits, Bash and Agent calls in the window and run drift after `tasks.md` edits in `hooks/io/reconcile.ts` and `hooks/register.tsx` until T008 passes

## Phase 4: Polish

- [X] T010 README: both toasts with examples, presets that show them, how to turn them off; v0.5.0 notes; roadmap
- [X] T011 Run validate, tests and tsc
## Phase 5: Review fixes (full review, 2026-10-07)

- [X] T013 Drift window per turn: a tick no longer empties the window; at most one drift toast per turn; the window resets at each main `turn.complete` and survives module reloads (amend FR-003); tests for successive ticks and a reload
- [X] T014 `namedPaths`: a token without a slash needs a known file extension; drop emails, domains and dotted identifiers (`ui.render`, `Node.js`); tests
- [X] T015 Confirm an Edit's tick from its own `old_string`/`new_string`, so a box ticked in another editor is never blamed on Claude's next edit; fold case on Windows roots; `specs/` files outside feature folders are not code; cap the window at 200 paths; tests
- [X] T016 Phase toasts: name the active feature's real next command, never toast a feature leaving `abandoned`, validate the stored value, write the store only with `toasts: all` and only when it changed, and skip the second state write when nothing changed; tests
- [X] T017 Fix the preset descriptions (plugin.json, README options table) and document the root and parallel-batch limits

- [X] T012 Full review with a stronger model; apply the fixes; mark `status: done`
