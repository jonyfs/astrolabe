---
description: "Task list for 002-band-hint"
---

# Tasks: Band, prompt hint, presets and themes

**Input**: `specs/002-band-hint/` (plan, research, data model, contracts)

**Tests**: required (Principle VI): each implementation task follows a failing test.

## Phase 1: Setup

- [X] T001 Add `userConfig` `preset` (`minimal|compact|full`, default `compact`) and `flavor` (`mocha|frappe|macchiato|latte`, default `mocha`) to `.claude-plugin/plugin.json`, bump `version` to `0.2.0`, and confirm `claude plugin validate .`
- [X] T002 Add render helpers (`installRenderEngine`, `drawBand`, `drawHint`) in `tests/helpers/render.tsx` that answers `ui.render` beneath the plugin with a keyed engine `Box`, mounts a component on a given surface, and returns its found elements

## Phase 2: User Story 4 - presets and flavors as data (P2, foundational for the others)

- [X] T003 [P] [US4] Failing tests in `tests/core/presets.test.ts`: the table in data-model.md, `presetOf({})` is `compact`, an unknown value falls back to `compact`
- [X] T004 [P] [US4] Failing tests in `tests/core/theme.test.ts`: four flavors, each with the eight roles as `#rrggbb`, `themeOf({})` is mocha, latte differs from mocha in every role
- [X] T005 [US4] Implement `hooks/core/presets.ts` and `hooks/core/theme.ts` until T003 and T004 pass

## Phase 3: User Story 1 and 2 - band rail and width (P1)

- [X] T006 [US1] Failing tests in `tests/core/band.test.ts` for FR-003 to FR-005: rail marks for each phase, template constitution, done, abandoned, guessed id, running step `…`, the bar cells and the count
- [X] T007 [US2] Failing tests in `tests/core/band.test.ts` for FR-006: the degradation order of contracts/band.md, every width 0 to 200 fits and keeps the id whole or draws nothing, and the exact forms at 80, 100, 144 and 200
- [X] T008 [US1] Implement `hooks/core/band.ts` (`bandSegments`) until T006 and T007 pass
- [X] T009 [US1] Failing render tests in `tests/integration/band.test.tsx` on `terminal` and `desktop`: the band text after `session.start` on the half-done fixture, the engine's own tree still a child, no Spec Kit or no active feature or `hasSurvey` passes, `preset: minimal` passes, `flavor: latte` colors, zero `fs.read` during the draw
- [X] T010 [US1] Implement `hooks/surfaces/band.tsx` and the `AbovePrompt` hook in `hooks/register.tsx` until T009 passes

## Phase 4: User Story 3 - prompt hint (P1)

- [X] T011 [P] [US3] Failing tests in `tests/core/hint.test.ts` for the table in contracts/band.md
- [X] T012 [US3] Implement `hooks/core/hint.ts` until T011 passes
- [X] T013 [US3] Failing render tests in `tests/integration/hint.test.tsx`: the `tail` passed beneath for implement and plan, unchanged for a draft, no Spec Kit and `minimal`
- [X] T014 [US3] Add the `PromptHint` hook to `hooks/register.tsx` until T013 passes

## Phase 5: Polish

- [X] T015 Update `README.md` (FR-012): the band part by part, the hint, both options with values and defaults and how to change them in `/config`, the truecolor note; update the roadmap and the status note for v0.2.0; humanize the prose
- [X] T016 Capture the real band and hint from `claude` in tmux at 100 and 180 columns into `docs/screens/002-band-100.txt` and `docs/screens/002-band-180.txt`
- [X] T017 Run `claude plugin validate .`, `claude plugin test .`, `npx -p typescript@5 tsc -p .`; fix every failure
- [ ] T018 Full review with a stronger model; apply the fixes; mark `status: done`

## Dependencies

T001 and T002 first; US4 data (T003 to T005) before the band and hint, which read presets and
tokens; US1/US2 and US3 are independent after that.
