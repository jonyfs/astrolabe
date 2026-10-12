---
description: "Task list for 065-band-and-status"
---

# Tasks: Band and Status

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md)

**Tests**: Required (Principle VI): each test task precedes the change it guards.

**Umbrella**: [063-design-review](../063-design-review/spec.md). The `#n` on a task is its improvement number.

## Format: `[ID] [P?] [Story] #n Description`

Run core tests with the scratch runner or `claude plugin test .`.

## Phase 1: Foundational

- [ ] T001 Extend `Segment` and `BandExtras` in `hooks/core/band.ts` per data-model.md (`chip`, `href`, `action`; `reserved`, `governor`, `live`, `deciding`) without changing any output yet; existing band tests stay green
- [ ] T002 [P] Add i18n keys (`band.paused`, `band.holding`, `band.lift`, `band.agents`, `band.gates`, `band.updates`) in `hooks/core/i18n/{en,pt-br,es,fr}.ts`

## Phase 2: User Story 1 - one row (P1)

- [ ] T003 [US1] #12 Write `tests/core/band.test.ts` cases for the one-row layout at 200, 144, 100 and 80 columns from board 2 (id chip, name, steps, step chip `▶ implement 9/20`, bar, `│ ▸ T011 …`); run and see them fail
- [ ] T004 [US1] #12 Rewrite `bandSegments` in `hooks/core/band.ts`: the id as an accent chip, finished steps `✓ name`, the current step as a `current` chip holding `n/m`, the bar and percentage only from 144 columns, then `│ ▸ <task id> <title>`; constitution only when not ratified; drop order task title, step names, feature name, bar, update label; `reserved` leaves room for the right-edge buttons
- [ ] T005 [US1] #12 Give `hooks/surfaces/band.tsx` chips (background from the role, foreground from `chipForeground`) and draw the update and hide buttons at the right edge of the same row; delete `updatesRow`; remove the `updates:` row in `hooks/register.tsx`
- [ ] T006 [US1] #19 Collapse two or more pending updates into one `⬆ N` button that opens the list and keep the name for one (`hooks/core/updates.ts`, band surface); test with one and two items

## Phase 3: User Story 2 - quick track (P1)

- [ ] T007 [P] [US2] #11 Add the quick-track case to `tests/core/band.test.ts`: a `track: quick` feature draws `spec → tasks → impl` and never clarify or plan
- [ ] T008 [US2] #11 Implement the quick rail in `hooks/core/band.ts`

## Phase 4: User Story 4 - paused and held (P1)

- [ ] T009 [P] [US4] #13 Add tests: at `stop` or `ceiling` the task slot reads `‖ paused until 07:00` in `blocked` with a `lift` action; at `hold` it reads `‖ holding new subagents`
- [ ] T010 [US4] #13 Implement the takeover in `hooks/core/band.ts`, draw the `lift 1h` Button in the surface and wire it to the existing allow machinery in `hooks/register.tsx`

## Phase 5: User Story 5 and 7 - one place for the next command, no repeats (P1, P2)

- [ ] T011 [P] [US5] #14 Update `tests/core/hint.test.ts` and `tests/integration/next-command.test.tsx`: an empty prompt shows the suggestion and the hint carries no next command; a prompt with text shows the next command in the hint and offers no suggestion
- [ ] T012 [US5] #14 Remove `nextRow` from AbovePrompt, make `hintTail` show the next command only when `isDraft`, keep `/astrolabe next` and `suggestNext`; update the band hotkey test in `tests/integration/help-rest.test.tsx`
- [ ] T013 [P] [US7] #16 Add the counts segment `3 agents · 3 gates` from `extras.live` and test that no task, agent or gate name appears in the band

## Phase 6: User Story 6 - status lead (P2)

- [ ] T014 [P] [US6] #15 Write `tests/core/status-lead.test.ts` with the status rows of board 2 at 200, 144, 100 and 80 columns
- [ ] T015 [US6] #15 Create `hooks/core/status-lead.ts` and use it in `drawStatus` when `footerIn` is `pane`; update the footer integration tests

## Phase 7: User Stories 8, 9, 10 (P2, P3)

- [ ] T016 [P] [US8] #17 Test that the id chip carries `href` of `spec.md` and a finished step its file; draw them with `Link` and the hover underline
- [ ] T017 [P] [US9] #18 Test that with the compact preset a finished phase brightens its chip for 30 seconds (`lighten`) and raises no toast, and with full it toasts; implement in `hooks/core/phase-toast.ts` and `hooks/register.tsx`
- [ ] T018 [US10] #20 Test that the idle band is the 80-column row, dimmed, with the deciding window; pass `deciding` from the register handler

## Phase 8: Polish

- [ ] T019 Clarification chip: open clarifications after plan draw ` ? clarify 2 ` in `blocked` (spec 042 #13 kept); `bandDensity` minimal equals the 80-column row at any width; add both tests
- [ ] T020 A test that the AbovePrompt render always awaits `next(e)` at 80, 100, 144, 180 and 200 columns on terminal and desktop
- [ ] T021 Regenerate `tests/core/snapshots.golden.ts` (`npx tsx scripts/update-snapshots.ts`), read the diff, commit it
- [ ] T022 Update README sections "What the band shows", "What the status entry shows" and "The next command"; list the new captures in `scripts/capture/flavors.sh` follow-up note
- [ ] T023 Run `claude plugin test .`, `claude plugin validate .`, `npm test`; tick the umbrella T011 to T020 for finished tasks

## Dependencies

T001, T002 first; T003 to T006 deliver the MVP (the one-row band). T007 to T020 follow in order; T021 to T023 last.
