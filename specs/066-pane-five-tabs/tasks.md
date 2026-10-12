---
description: "Task list for 066-pane-five-tabs"
---

# Tasks: Pane in Five Tabs

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md). Tests first (Principle VI). `#n` is the improvement number of the umbrella 063.

## Phase 1: Five tabs, overlay, legend, badges (P1)

- [x] T001 [US1] #21 Write `tests/core/pane-tabs.test.ts`: five tabs with hotkeys 1 to 5, `legacyTab` maps `dashboard` to `session`, `config` and `models` to `setup`, `help` and unknown to `specs`
- [x] T002 [US1] #21 Create `hooks/core/pane-tabs.ts`; change `PaneTab` and `PaneState.help` in `types/index.d.ts`; use the table in `hooks/surfaces/pane.tsx` and `hooks/register.tsx` (select, stored tab, per-tab render): Session shows the session rows then the Dashboard sections, Setup shows the options then the model block
- [x] T003 [US1] #21 Help as an overlay: `?` (pressed as `h`) toggles `PaneState.help`, a tab press clears it; add integration tests on terminal and desktop
- [x] T004 [P] [US2] #22 Tests: the tab row holds tabs and the close button only; the legend row holds `key verb` buttons whose labels carry no hotkey prefix (no `hf:` or `po:`)
- [x] T005 [US2] #22 Move filter, status, order, priority, advisor and refresh into a legend row of plain Buttons in `hooks/surfaces/pane.tsx`; shorten verbs at 80 columns
- [x] T006 [P] [US3] #23 Tests for `badgesOf`: features in progress, open tasks of the active feature, open pull requests, `▲` for a holding or pausing governor, nothing when nothing waits
- [x] T007 [US3] #23 Implement `badgesOf` and use it in the pane render

## Phase 2: Bodies (P1 to P3)

- [x] T008 [P] [US4] #24 Test that the selected spec renders as a block: row, counts line, the three actions, then gstack skills only when gstack is installed
- [x] T009 [US4] #24 Draw the block on a surface background in the Specs body
- [x] T010 [P] [US5] #25 Test the fixed section order and the Early and Ready to close sections in `tests/core/pane.test.ts`
- [x] T011 [US5] #25 Implement the section order in `hooks/core/pane.ts`
- [x] T012 [P] [US5] #26 Tests for empty states of each tab, including a project without Spec Kit
- [x] T013 [US5] #26 Implement `emptyState` and use it in the tab bodies
- [x] T014 [P] [US6] #27 Tests for Setup groups, the `•` mark on non-default values, the default on hover and the footnote
- [x] T015 [US6] #27 Group Setup under Look, Usage governor, Claude and Model per skill
- [x] T016 [P] [US7] #28 Tests for the PRs table cells (number, title, draft, labels, review, checks as `✓ ✖ ◷`) and row links
- [x] T017 [US7] #28 Draw the PRs tab as a table
- [x] T018 [P] [US8] #29 Test the help overlay groups keys by tab and gives one example per Specs filter
- [x] T019 [US8] #29 Rewrite the help rows by tab
- [x] T020 [P] [US8] #30 Test that the pane title says why the spec is active: `feature.json`, branch or highest open spec
- [x] T021 [US8] #30 Implement the title reason in `hooks/register.tsx`

## Phase 3: Tasks, Session and widths (P1, P2)

- [x] T022 [P] [US9] Tests for the Tasks header (`002 shopping-cart · implement · 9/20 · ≈1h20 left`), the warning row when open tasks pass the 5h reset, user-story counts, parallel brackets and the folded done line
- [x] T023 [US9] Implement the Tasks header and estimate in `hooks/core/pane.ts`
- [x] T024 [P] [US10] Tests for the Session usage rows with 20-cell bars and governor ticks and the governor box
- [x] T025 [US10] Implement the usage bars with `┊` ticks
- [x] T026 [P] [US11] Tests at 60, 80 and 100 pane columns for each tab, and the governor question with the cautious answer applied
- [x] T027 [US11] Implement the width forms (done). The governor question keeps its current wording ("Run this one now", "Allow subagents for 1 hour", "Drop this request", with the cautious default applied); the board's copy is left for a follow-up because it renames the dialog's three answers.

## Phase 4: Polish

- [x] T028 Update i18n keys in four languages with equal widths (`tests/core/i18n.test.ts` passes)
- [x] T029 Regenerate the golden snapshots; update the README section "The /astrolabe pane"; run the suites; tick umbrella T021 to T030
