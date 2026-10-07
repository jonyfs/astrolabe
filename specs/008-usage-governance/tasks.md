---
description: "Task list for 008-usage-governance"
---

# Tasks: Usage governance

**Tests**: required (Principle VI).

## Phase 1: Setup

- [X] T001 `plugin.json`: `governUsage` (boolean, default true), version `0.8.0` (and `hooks/core/version.ts`); `types/index.d.ts`: `UsageReading`, `UsageState`, `astrolabe.usage`

## Phase 2: User Story 1 and 2 (P1)

- [X] T002 [US1] Failing tests in `tests/core/governor.test.ts`: `decide` for every band, caps, projection, override; `usageSegment`; `isReadOnlyTool`; `parseAllow`; `resumePrompt`; refusal texts
- [X] T003 [US1] Implement `hooks/core/governor.ts` until T002 passes
- [X] T004 [US1] Failing integration tests in `tests/integration/governor.test.ts`: `session.measure` updates the status entry; no readings, no gating
- [X] T005 [US2] Failing integration tests: throttle cap with in-flight foreground Agent calls; hold refuses and queues; reset submits one resume prompt and clears the queue
- [X] T006 [US1] [US2] Implement measurement, Agent gating, queue and resume in `hooks/register.tsx` until T004 and T005 pass

## Phase 3: User Story 3 (P1)

- [X] T007 [US3] Failing integration tests: stop refuses non-read-only tools with the reset time and allows Read; `/astrolabe allow 95 2h` from the composer lifts stop to 95; from another origin it is refused; `revoke`; `governUsage: false` gates nothing
- [X] T008 [US3] Implement the pause, the owner command and the option until T007 passes

## Phase 4: Polish

- [X] T009 README: replace the roadmap's usage section with the shipped behavior; option; owner command; note about the project's usage-governor skill; v0.8.0
- [X] T010 Run validate, tests, tsc and the release script check
- [X] T011 Full review with a stronger model: skipped at the owner's request on 2026-10-07 (usage limits blocked subagents); merged and released without it. `status: done`
