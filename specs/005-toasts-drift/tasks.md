---
description: "Task list for 005-toasts-drift"
---

# Tasks: Phase toasts and the drift alarm

**Tests**: required (Principle VI).

## Phase 1: Setup

- [ ] T001 Bump `plugin.json` to `0.5.0`; extend the memo in `types/index.d.ts` (`window`, `toasted`, `baselined`) and `emptyMemo`; answer `$.store` and record toasts in `tests/helpers/fake-fs.ts` (`mock.store`, `ui.toast`); allow only `baseline:` store keys in `tests/integration/no-writes.test.ts`

## Phase 2: User Story 1 - phase toasts (P1)

- [ ] T002 [US1] Failing tests in `tests/core/phase-toast.test.ts` for FR-001 (first reconcile silent, later phase toasts once, backwards silent, abandoned silent, texts from contracts/toasts.md)
- [ ] T003 [US1] Implement `hooks/core/phase-toast.ts` until T002 passes
- [ ] T004 [US1] Failing integration tests in `tests/integration/toasts.test.ts`: with `full`, a stored baseline and a turn that writes `plan.md` toast once; `compact` and `minimal` silent; a skill hint alone silent
- [ ] T005 [US1] Wire the baseline and phase toasts into `hooks/register.tsx` until T004 passes

## Phase 3: User Story 2 - drift (P1)

- [ ] T006 [US2] Failing tests in `tests/core/drift.test.ts`: `newlyTicked`, `namedPaths`, `detectDrift` for every scenario of US2
- [ ] T007 [US2] Implement `hooks/core/drift.ts` until T006 passes
- [ ] T008 [US2] Failing integration tests in `tests/integration/toasts.test.ts`: tick with no edit toasts; with a code edit no toast; named file missing toasts the path; Bash or Agent in the window silent; external tick silent; `minimal` silent
- [ ] T009 [US2] Record code edits, Bash and Agent calls in the window and run drift after `tasks.md` edits in `hooks/io/reconcile.ts` and `hooks/register.tsx` until T008 passes

## Phase 4: Polish

- [ ] T010 README: both toasts with examples, presets that show them, how to turn them off; v0.5.0 notes; roadmap
- [ ] T011 Run validate, tests and tsc
- [ ] T012 Full review with a stronger model; apply the fixes; mark `status: done`
