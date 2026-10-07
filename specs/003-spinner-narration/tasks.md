---
description: "Task list for 003-spinner-narration"
---

# Tasks: Spinner narrates the current task

**Tests**: required (Principle VI).

## Phase 1: Setup

- [X] T001 Bump `.claude-plugin/plugin.json` to `0.3.0`; add `drawSpinner` to `tests/helpers/render.tsx` (mounts `Spinner`, records the `suffix` handed to the engine)

## Phase 2: User Story 1 (P1)

- [X] T002 [US1] Failing tests in `tests/core/spinner.test.ts`: `cleanTaskText` (FR-003), `formatElapsed` (contract table), `spinnerSuffix` gating (FR-001), format (FR-002), budget and cuts (FR-004) for every budget 0 to 120
- [X] T003 [US1] Implement `hooks/core/spinner.ts` until T002 passes
- [X] T004 [US1] Failing render tests in `tests/integration/spinner.test.tsx` on `terminal` and `desktop`: narration after a `speckit-implement` call, after an Edit under the active feature, none in an unrelated turn, none after `turn.complete`, none with `minimal`, the engine's `message` kept, zero file reads
- [X] T005 [US1] Add the `Spinner` hook to `hooks/register.tsx` until T004 passes

## Phase 3: Polish

- [X] T006 README: what the spinner says, when, and an example; roadmap and status note for v0.3.0
- [X] T007 Run validate, tests and tsc (done). Live spinner capture skipped: it needs a real turn that edits the feature; the render tests cover both surfaces
- [X] T008 Full review with a stronger model: skipped at the owner's request on 2026-10-07 (usage limits blocked subagents); merged and released without it. `status: done`
