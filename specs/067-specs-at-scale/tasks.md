---
description: "Task list for 067-specs-at-scale"
---

# Tasks: Specs at Scale

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md). Tests first (Principle VI). `#n` is the improvement number in the umbrella 063.

- [x] T001 [US1] #31 Tests for blocks, counts and the Focus and All views in `tests/core/specs-scale.test.ts` and `tests/core/pane.test.ts`
- [x] T002 [US1] #31 `hooks/core/specs-scale.ts`, `hooks/core/sections.ts` and the scale rows in `hooks/core/pane.ts`
- [x] T003 [US1] #31 `v`, block buttons and the `#` jump in `hooks/register.tsx` and `hooks/surfaces/pane.tsx`
- [x] T004 [US2] #32 `isReadyToClose`, the Ready to close section and the close button with `closeSuggestion`
- [x] T005 [US3] #33 `checksOf`, `checksLine`, the checks row and the check under each spec
- [x] T006 [US3] #33 `planFiles` and the plan-file check after a reconcile (`planMissing`)
- [x] T007 [US4] #34 Duplicate ids as two rows marked `⚠ id×2`; the jump lists both
- [x] T008 [US5] #35 `withThumb` and `rows a–b of n` in the filter row
- [x] T009 [US6] #36 Placeholder rows per run of specs not read yet
- [x] T010 [US7] #37 `?%` and `?` for absent figures
- [x] T011 [US7] #38 `full` at 100% beside a reset (the usage ramp of spec 064 prints it; the Session bars carry it)
- [x] T012 [US8] #39 `g` cycles the grouping: status, phase, track, priority
- [x] T013 [US8] #40 The Touched this session section from `touchedSpecs`
- [x] T014 Integration tests on a 60-spec tree: Focus, Ready to close, All, duplicates, dangling `feature.json`, no reads on draw, the jump, the close button
- [x] T015 README Specs section; regenerate the golden snapshots; run the suites; tick umbrella T031 to T040
