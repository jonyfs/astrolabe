---
description: "Task list for 064-design-tokens"
---

# Tasks: Design Tokens

**Input**: Design documents from `specs/064-design-tokens/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/tokens-api.md](contracts/tokens-api.md)

**Tests**: Required. Principle VI (test-first) applies: each test task comes before the change it guards and must fail first.

**Umbrella**: [063-design-review](../063-design-review/spec.md). The `#n` on a task is the improvement number; the umbrella ticks T00n when this task is ticked.

## Format: `[ID] [P?] [Story] #n Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: user story from spec.md
- **#n**: improvement number from the umbrella
- Run a single test file with `npx vitest run tests/core/<name>.test.ts`

## Phase 1: Setup

- [x] T001 Run the baseline with `npm test` (Node tool tests) and `claude plugin test .` (mod tests, about 90 s; three integration tests time out at 5 s under load) and note it in the pull request description
- [ ] T002 [P] Add a fixed-clock fixture helper for snapshots in `tests/helpers/snapshot-fixture.ts` (fixed `now`, a project with 3 and 4 digit feature ids, readings at 59, 60, 81 and 100 percent, a paused and a held governor decision)

---

## Phase 2: Foundational (blocks every story)

- [x] T003 [P] Extend the contrast loop in `tests/core/theme.test.ts`: export `TEXT_ROLES` from `hooks/core/theme.ts` and add `faint` and `warn` to the checked roles; run it and see it fail (roles missing)
- [x] T004 [P] Add `tool-tests/unit/no-literal-colour.vitest.ts` (a Node vitest, run by `npm test`, because mod tests cannot read the source tree): scan every file under `hooks/` except `hooks/core/theme.ts` for `#[0-9a-fA-F]{6}` and fail on any hit
- [x] T005 Add roles `faint` and `warn` to `ROLES`, `THEME_TOKENS` (`subtle`, `warning`) and every flavor in `hooks/core/theme.ts`, with the values from research.md R1: mocha `#9399b2`, frappe `#949cbb`, macchiato `#939ab7`, latte `#686b80`, colorblind `#9a9a9a`; `warn` from the chip yellows (mocha `#f9e2af`, frappe `#e5c890`, macchiato `#eed49f`, colorblind `#fff0a6`) and, for latte, the lightest yellow that reaches 4.5:1 on `#eff1f5`; T003 now passes

**Checkpoint**: roles exist and pass contrast.

---

## Phase 3: User Story 1 - One usage ramp (Priority: P1)

**Goal**: context, 5h, 7d and spend colour and mark identically; `full` at 100.

**Independent Test**: `npx vitest run tests/core/usage-ramp.test.ts tests/core/footer.test.ts tests/core/governor.test.ts`

- [x] T006 [P] [US1] #1 Write `tests/core/usage-ramp.test.ts` from contracts/tokens-api.md: 59 ok no mark, 60 warn `▵`, 79 warn, 80 block `▴`, 100 block `▴` and `full`, `{ hold: 70 }` moves the block level to 70, `{ hold: 50 }` warns and blocks from 50 with no inverted band, undefined and NaN give ok with no mark
- [x] T007 [US1] #1 Create `hooks/core/usage-ramp.ts` exporting `usageRamp` and `UsageRamp` as in data-model.md; T006 passes
- [x] T008 [US1] #1 In `hooks/core/footer.ts` delete `rampOf` and build chip colour and mark from `usageRamp` (context chip keeps no mark); add a case to `tests/core/footer.test.ts` that the 7d reading at 81% on hold reads `7d 81%▴` in the block colour, and one that `thresholds` move the ramp
- [x] T009 [US1] #1 In `hooks/core/governor.ts` make `usageSegment` print the ramp mark and `full` beside the reset from `usageRamp`; update `tests/core/governor.test.ts` so the held 7d chip reads `7d 81%▴ hold`
- [x] T010 [P] [US1] #1 In `hooks/core/dashboard.ts` and `hooks/core/pane.ts` colour every usage value from `usageRamp(...).role` (replace the peach `current` used for usage levels); extend `tests/core/dashboard.test.ts` and `tests/core/pane.test.ts` to assert the roles at 59, 81 and 100

**Checkpoint**: US1 independently green.

---

## Phase 4: User Story 2 - Readable muted text (Priority: P1)

**Goal**: muted text uses `faint`; `pending` only for rules, separators and glyphs.

**Independent Test**: `npx vitest run tests/core/theme.test.ts tests/core/pane.test.ts`

- [x] T011 [P] [US2] #2 Write the tests first: in `tests/core/pane.test.ts` abandoned, loading and principle rows carry role `faint` and no `dim` flag, and no text row has role `pending`; add `tool-tests/unit/pending-role-scope.vitest.ts`, a Node scan that lists the only files allowed to draw with `pending` (rules, separators, glyphs); run them and see them fail on the current `dim` rows
- [x] T012 [US2] #2 Replace the terminal `dim` attribute with the `faint` role: remove `dim` from `PaneRow` in `hooks/core/pane.ts`, give abandoned, loading, done-folded and principle rows `role: 'faint'`, drop `dimColor` in `hooks/surfaces/pane.tsx`, colour the legend `faint`, switch the model-tier and dashboard abandoned labels to `faint`, and give the usage picture's trend line the ramp role in `hooks/core/pixels.ts`; T011 and T003 pass

---

## Phase 5: User Story 3 - Narrow state glyphs (Priority: P1)

**Goal**: `‖`, `◷`, `▲` where a row changes state; one width measure.

**Independent Test**: `npx vitest run tests/core/glyphs.test.ts tests/core/icons.test.ts`

- [x] T013 [P] [US3] #3 Write `tests/core/glyphs.test.ts`: `textWidth` of each `STATE_GLYPHS` value is 1; every entry of the nerd set is width 1; every entry of the ascii set is printable ASCII; emoji entries wider than 1 are all in `EMOJI_WIDE`; and add `tool-tests/unit/state-glyphs.vitest.ts`, a Node scan that `⏸`, `⏱`, `⚠` appear under `hooks/` only in `icons.ts` and `glyphs.ts`
- [x] T014 [US3] #3 Create `hooks/core/glyphs.ts` with `STATE_GLYPHS` and `EMOJI_WIDE`; make `textWidth` in `hooks/core/footer.ts` read the wide entries from `EMOJI_WIDE` instead of hard-coding `⏳`, `⏱` and `⚠`
- [x] T015 [US3] #3 Use `◷` for the running clock in `hooks/core/pane.ts`, map `◷`, `‖` and `▲` in the `MARKS` table of `hooks/core/icons.ts`, and drop the glyph from the `hooks/register.tsx` comment (`‖` itself is first drawn by the band in spec 065); update expected strings in `tests/core/pane.test.ts`
- [x] T016 [P] [US3] #3 Replace the same glyphs in `hooks/core/i18n/en.ts`, `pt-br.ts`, `es.ts` and `fr.ts`, keeping each string's width equal across the four files (`tests/core/i18n.test.ts` passes)

---

## Phase 6: User Story 4 - Whole, aligned ids (Priority: P1)

**Goal**: task ids as written; feature ids padded to the widest, never cut.

**Independent Test**: `npx vitest run tests/core/ids.test.ts tests/core/tasks-parser.test.ts tests/core/pane.test.ts`

- [x] T017 [P] [US4] #4 Write `tests/core/ids.test.ts` (`idWidth` of `['001','064']` is 3, of `['001','1000']` is 4, minimum 3; `padId('064', 4)` is `064 `; `padId` never shortens) and add a case to `tests/core/tasks-parser.test.ts` that `T011` is kept and `T11` is never produced
- [x] T018 [US4] #4 Create `hooks/core/ids.ts` with `idWidth` and `padId`
- [x] T019 [US4] #4 Use `padId` and `idWidth` for feature ids in `hooks/core/pane.ts`, `hooks/core/status-text.ts` and `hooks/core/summary.ts`; make the pane's width fitting cut other text before an id; add a pane test at 80 columns with a 4-digit id that asserts the id is complete

---

## Phase 7: User Story 5 - One language for time, phases, keys, messages (Priority: P2)

**Goal**: one duration format, phase table, key table, message prefix and separator rule.

**Independent Test**: `npx vitest run tests/core/duration.test.ts tests/core/phase.test.ts tests/core/keys.test.ts tests/core/message.test.ts tests/core/zones.test.ts`

Each block below touches different new files; the apply tasks share `pane.ts` and `footer.ts`, so do them in order.

### #5 duration

- [x] T020 [P] [US5] #5 Write `tests/core/duration.test.ts`: `40000` is `40s`, `252000` is `4m12s`, `7740000` is `2h09m`, `undefined` and `NaN` are `?`; `resetIn` under a day counts down, beyond a day is `Thu 18:00`, missing or past is `?`
- [x] T021 [US5] #5 Create `hooks/core/duration.ts` with `duration` and `resetIn`
- [x] T022 [US5] #5 Replace the seven copies: `hooks/core/footer.ts` (`duration`, `resetOf`), `hooks/core/governor.ts` (two spans), `hooks/core/pane.ts`, `hooks/core/summary.ts`, `hooks/core/dashboard.ts` and `formatElapsed` in `hooks/core/spinner.ts`; update the expected strings in their tests

### #6 phases

- [ ] T023 [P] [US5] #6 Add to `tests/core/phase.test.ts`: `phaseShort('specify')` is `spec`, `clarify` is `clar`, `plan` `plan`, `tasks` `tasks`, `implement` `impl`
- [ ] T024 [US5] #6 Add `PHASE_SHORT` and `phaseShort` to `hooks/core/phase.ts`
- [ ] T025 [US5] #6 Use `phaseShort` wherever a surface shortens a phase: `hooks/core/status-text.ts`, `hooks/core/band.ts`, `hooks/core/pane.ts`, `hooks/core/footer.ts`; add a status-text test at a width that forces the short form

### #7 keys

- [ ] T026 [P] [US5] #7 Write `tests/core/keys.test.ts`: table holds `r q ? / c o p a space esc`, `verbOf('h')` resolves to `?`, no key appears twice
- [ ] T027 [US5] #7 Create `hooks/core/keys.ts` with `KEY_VERBS` and `verbOf`
- [ ] T028 [US5] #7 Make `hooks/modules/help.ts`, the pane's legend text in `hooks/core/pane.ts` and the key handling in `hooks/register.tsx` read the table; `h` stays an alias of `?`; align `i18n` key labels

### #8 prefix

- [ ] T029 [P] [US5] #8 Write `tests/core/message.test.ts` (`message('ok','x')` is `astrolabe ✓ x`, `message('warn','x')` is `astrolabe ▲ x`) and update `tests/core/toasts.test.ts` and `tests/core/status-text.test.ts` to expect the prefix and no `🧭` or `astrolabe:`
- [ ] T030 [US5] #8 Create `hooks/core/message.ts` with `message`
- [ ] T031 [US5] #8 Build every toast and the status entry text through `message` in `hooks/core/toasts.ts`, `hooks/core/status-text.ts`, `hooks/core/phase-toast.ts` and the toast call sites in `hooks/register.tsx`; leave the `$.ui.log(..., { to: 'debug' })` strings as they are (research.md R6); keep `MAX_TOAST_LENGTH`

### #9 separators

- [ ] T032 [P] [US5] #9 Write `tests/core/zones.test.ts`: zones are joined by ` │ `, items by ` · `, an item that contains `│` makes the test helper throw
- [ ] T033 [US5] #9 Create `hooks/core/zones.ts` with `joinZones`
- [ ] T034 [US5] #9 Build the footer line, the band text and the status entry through `joinZones` in `hooks/core/footer.ts`, `hooks/core/band.ts` and `hooks/core/status-text.ts`; add assertions that no rendered zone holds both separators

---

## Phase 8: User Story 6 - README captures in every flavor (Priority: P3)

**Goal**: every surface in mocha and latte, one each in frappe, macchiato and colorblind; readable latte text.

**Independent Test**: `npm run generate-images` then check the README's image paths exist.

- [ ] T035 [US6] #10 Extend `scripts/generate-images.ts` with the flavor matrix (band, status, footer, pane, dashboard in mocha and latte; one surface each in frappe, macchiato and colorblind) and add `tests/core/capture-matrix.test.ts` that lists the expected file names
- [ ] T036 [P] [US6] #10 Add an assertion to `tests/core/theme.test.ts` that latte's `current` and `warn` reach 4.5:1 on its base (peach stays darkened for text)
- [ ] T037 [US6] #10 Update `README.md` (the sections that show the band, status entry, footer and pane) to name the new glyphs, ramp, durations, prefix and key verbs, with a working example for each; then run `npm run generate-images` and commit the regenerated `docs/images`

---

## Phase 9: Polish and cross-cutting

- [ ] T038 Add `tests/core/snapshots.test.ts`: band, status entry, footer and pane text for mocha, latte, frappe, macchiato and colorblind at 80, 100, 144 and 200 columns from the T002 fixture (the live table joins in spec 069)
- [ ] T039 Fix any literal colour T004 reports in `hooks/surfaces/*` and `hooks/register.tsx` by passing a theme role through the core instead
- [ ] T040 Run `npm test`, `npm run typecheck` and the commands in `quickstart.md`; every one passes
- [ ] T041 Tick T001 to T010 in `specs/063-design-review/spec.md` for the improvements whose tasks here are ticked, and set this spec's front matter `status: done` when T001 to T040 are ticked

---

## Dependencies and order

- Phase 1 then Phase 2 (T003 and T004 are red first, T005 turns T003 green).
- US1 to US4 depend only on Phase 2 and can run in parallel after it, except that each apply task edits `pane.ts` or `footer.ts`: finish one apply task before starting the next that touches the same file.
- US5 blocks follow US1 to US4 for `pane.ts` and `footer.ts` edits.
- US6 follows US1 to US5 (captures show the final surfaces).
- Phase 9 last.

## Parallel examples

```text
After T005: T006, T011, T013, T017 can be written together (four new test files).
Within US5: T020, T023, T026, T029, T032 are independent test files.
```

## Implementation strategy

MVP is US1 (the ramp): it fixes the visible defect, `7d 81%▴ hold` in the block colour. Ship in this order: Phase 1, 2, US1, US2, US3, US4 (all P1), then US5, then US6, then Polish. Each story ends green on its own test command, so a stop after any checkpoint leaves a working tree.
