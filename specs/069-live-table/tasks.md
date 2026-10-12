---
description: "Task list for 069-live-table"
---

# Tasks: Live Table

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md). Tests first (Principle VI). `#n` is the improvement number in the umbrella 063.

- [x] T001 [US1] #43 Tests for rows, grouping, `+N`, blank cells and column reservation in `tests/core/live-table.test.ts`
- [x] T002 [US1] #43 `hooks/core/live-table.ts`: row builders and the layout
- [x] T003 [US3] #43 Tests and code for the drop order and the short-window shedding
- [x] T004 [US2] #44 Tests for the process-list parser, patterns, nesting and the lock
- [x] T005 [US2] #44 `parseProcesses` and `detectGates` in `hooks/core/live-table.ts`
- [x] T006 [US1] #43 Agent records on the `Agent` tool call and their end
- [x] T007 [US2] #44 The gate scan on `$.clock` every 15 seconds into `$.state`; the failed-gate toast
- [x] T008 [US1] #43 `hooks/surfaces/live-table.tsx` and the table above `next(e)` in `AbovePrompt`
- [x] T009 [US4] #43 `liveRows` option in `plugin.json` and README
- [x] T010 The Session tab lists every live row; i18n keys in four languages
- [x] T011 Integration tests: terminal and desktop, no reads on draw
- [x] T012 README "What the live table shows"; regenerate snapshots; run the suites; tick umbrella T043 and T044
