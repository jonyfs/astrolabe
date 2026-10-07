---
description: "Task list for 004-pane"
---

# Tasks: The /astrolabe pane

**Tests**: required (Principle VI).

## Phase 1: Setup

- [X] T001 Bump `plugin.json` to `0.4.0`; add `astrolabe.pane` to `types/index.d.ts`; add `drawPane`, `pressPane` and a `command.run` helper to `tests/helpers/render.tsx`

## Phase 2: User Story 1 and 2 (P1)

- [X] T002 [US1] Failing tests in `tests/core/pane.test.ts` for `specsRows` (marks, active, dimmed abandoned, warnings, width), `taskRows` (open tasks, `+N more`, empty cases) and `sessionRows`
- [X] T003 [US1] Implement `hooks/core/pane.ts` until T002 passes
- [X] T004 [US1] Failing tests in `tests/integration/pane.test.tsx`: the command registers and opens the pane with its title and answer; the Specs tab on terminal and desktop; no Spec Kit message; zero file reads while drawing
- [X] T005 [US2] Failing tests in `tests/integration/pane.test.tsx`: pressing `tab-tasks` and `tab-session` switches the tab and it stays
- [X] T006 [US1] Implement `hooks/surfaces/pane.tsx` and the command, open, `Pane` render and tab hooks in `hooks/register.tsx` until T004 and T005 pass

## Phase 3: User Story 3 (P2)

- [X] T007 [US3] Failing tests: with `full`, a band draw at 150 fullscreen columns then `turn.complete` opens the pane once; at 143 columns, not fullscreen, or with `compact`, it does not
- [X] T008 [US3] Implement the unasked open in `hooks/register.tsx` until T007 passes

## Phase 4: Polish

- [X] T009 README: the command, each tab with an example, hotkeys, the unasked-open rule; v0.4.0 notes; roadmap
- [X] T010 Run validate, tests and tsc; capture the pane in tmux into `docs/screens/004-pane-*.txt`
- [ ] T011 Full review with a stronger model; apply the fixes; mark `status: done`
