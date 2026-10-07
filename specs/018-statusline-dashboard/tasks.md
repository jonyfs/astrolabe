# Tasks: Astrolabe replaces the statusline

**Input**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md)
**Tests**: required (Principle VI): each test task comes before the code it covers and must fail first.

## Phase 1: Setup

- [X] T001 Add `SessionStats`, `GitState` and the `session` key to the contract in `types/index.d.ts`, re-exported from `hooks/core/types.ts`
- [X] T002 Add the `icons` option (`auto`, `nerd`, `emoji`, `ascii`; default `auto`) to `.claude-plugin/plugin.json`

## Phase 2: Foundational

- [X] T003 [P] Failing tests for the icon sets and `auto` by surface in `tests/core/icons.test.ts`
- [X] T004 [P] Failing tests for the cell grid, its Raster encoding, its Svg and its text form in `tests/core/cells.test.ts`
- [X] T005 [P] `hooks/core/icons.ts`
- [X] T006 [P] `hooks/core/cells.ts`

## Phase 3: User Story 1, the footer (P1)

**Independent test**: one turn in a git repository; the status entry carries every part, in order, and drops from the end when narrow.

- [X] T007 [P] [US1] Failing tests for the porcelain v2 parser (branch, upstream, ahead, behind, changed, conflicts, detached, no upstream) in `tests/core/git-status.test.ts`
- [X] T008 [P] [US1] Failing tests for the footer parts, their order, missing data and fitting at 80, 120 and 200 columns in `tests/core/footer.test.ts`
- [X] T009 [US1] Failing integration tests in `tests/integration/footer.test.ts`: model and effort from `turn.step`, context and cost from `session.measure`, the git query once per main turn and never while drawing, a failing git leaving the branch, the duration
- [X] T010 [P] [US1] `hooks/core/git-status.ts`
- [X] T011 [P] [US1] `hooks/core/footer.ts`
- [X] T012 [US1] Wiring in `hooks/register.tsx`: the `turn.step` observer, measure fields, the git query at `turn.complete`, the counters, the last width from drawings, `showStatus` through the footer

## Phase 4: User Story 2, icons (P2)

- [X] T013 [US2] Failing tests: the footer, band and pane with each `icons` value on the terminal and Desktop surfaces, in `tests/integration/icons.test.tsx`
- [X] T014 [US2] Use the icon set in the footer and the Dashboard; the band and pane keep their Unicode marks, which the ascii text form maps to plain characters

## Phase 5: User Story 3, the Dashboard (P2)

**Independent test**: a scripted session, then the pane's tab `4`; each KPI matches.

- [X] T015 [P] [US3] Failing tests for the KPI rows, the dial, the phase bars, the usage line with its projection, the burn rate, and the fallback to numbers below each chart's minimum width, in `tests/core/dashboard.test.ts`
- [X] T016 [US3] Failing integration tests in `tests/integration/dashboard.test.tsx`: tab `4` on terminal (Raster) and Desktop (Svg), counts after a scripted session, no reading, a narrow pane, no file read while drawing
- [X] T017 [US3] `hooks/core/dashboard.ts`
- [X] T018 [US3] `hooks/surfaces/dashboard.tsx` and the fourth tab in `hooks/surfaces/pane.tsx` and `hooks/register.tsx`

## Phase 6: Polish

- [X] T019 README: the footer with the map of what the statusline showed and where it is now, what is left out and why, the `icons` option, the Dashboard. New captures of the footer and the Dashboard move to spec 027 (#56, README images built in CI)
- [X] T020 Humanizer pass on the README and this feature's documents
- [X] T021 Audit report and version 0.12.0 in `.claude-plugin/plugin.json` and `hooks/core/version.ts`
- [X] T022 `claude plugin validate .`, `tsc`, `claude plugin test .`; state size under 4 KB after a 200-turn scripted session

## Dependencies

Phase 1, then Phase 2, then US1. US2 and US3 depend on Phase 2 and can go in either order after US1.
