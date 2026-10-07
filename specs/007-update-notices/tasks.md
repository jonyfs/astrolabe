---
description: "Task list for 007-update-notices"
---

# Tasks: Clickable update notices

**Tests**: required (Principle VI).

## Phase 1: Setup

- [X] T001 `plugin.json`: `userConfig` `checkUpdates` (boolean, default true), version `0.7.0`; `types/index.d.ts`: `UpdateItem`, `astrolabe.updates`; fakes for `process.run`, `http.fetch`, `prompt.submit` in `tests/helpers/fake-fs.ts`

## Phase 2: User Story 1 - detect (P1)

- [X] T002 [US1] Failing tests in `tests/core/updates.test.ts`: `parseGstackCheck`, `parseSelfCheck`, `parseCliVersion`, `compareVersions`, `localDay`, `astrolabeUpdate`, `skillsUpdate`
- [X] T003 [US1] Implement `hooks/core/updates.ts` until T002 passes
- [X] T004 [US1] Failing integration tests in `tests/integration/updates.test.tsx`: checks run once per day, results stored and shown in the band row and the pane, a failing tool is left out, `checkUpdates: false` makes no process or network call
- [X] T005 [US1] Implement the checks and the band and pane rows in `hooks/register.tsx` and `hooks/surfaces/band.tsx` until T004 passes

## Phase 3: User Story 2 - one click (P1)

- [X] T006 [US2] Failing integration tests: each button's action, success and failure toasts, the skills confirm step, the item dropped on success
- [X] T007 [US2] Implement the button actions in `hooks/register.tsx` until T006 passes

## Phase 4: Polish

- [X] T008 README: the checks, the network call, each button, `checkUpdates`; v0.7.0 notes; remove 007 from the roadmap
- [X] T009 Run validate, tests and tsc
- [ ] T010 Full review with a stronger model; apply the fixes; mark `status: done`
