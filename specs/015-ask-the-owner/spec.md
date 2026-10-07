---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: The governor asks before it holds or pauses

> Amended by spec 017 (0.11.1): the gate refuses at once with the default and asks afterwards, because a hook has 10 seconds. FR-003, FR-004 and FR-006 below describe 0.10.0; see `specs/017-ask-never-blocks/spec.md`.

**Created**: 2026-10-07 · **Source**: the owner's request (`/investigate`, 2026-10-07); options chosen in D1: the full set

## Problem

At 80% the governor queues every new subagent, and at 88% it pauses the main thread, without
asking. Lifting either one takes a typed `/astrolabe allow` (stop and ceiling only); nothing
lifts the hold. The owner wants to be asked: a list of suggested answers, one picked with the
arrows and Enter, and after a minute with no answer the default goes ahead by itself.

## Requirements

- **FR-001**: When the gate would queue a subagent in the hold band, it MUST ask first, with
  these answers in this order: `Queue it until <reset>` (default), `Run this one now`,
  `Allow subagents for 1 hour, one at a time`, `Drop this request`.
- **FR-002**: When the gate would refuse a main-thread tool at stop or ceiling, it MUST ask
  first: `Pause until <reset>` (default), `Continue for 30 more minutes (ceiling N%)`,
  `Raise the ceiling to M% for 2 hours`. N is at least 91 and M at least 95, each at least two
  points above current usage and at most 99; an answer whose ceiling would not be above
  current usage is left out.
- **FR-003**: The question MUST be a pane opened with focus (`astrolabe-usage`), holding a
  `Select` whose first option is the default and is focused, so Enter takes it. The pane says
  when the default goes ahead. Where the pane cannot be placed (below 144 columns, unasked), the
  engine's own `$.ui.ask` dialog asks instead.
- **FR-004**: After 60 seconds with no answer, or on Esc, the default MUST go ahead and the pane
  closes. (Esc is not covered by a test: the test kit cannot close a pane as the person.) In the `$.ui.ask` fallback a dialog answered after the timeout still applies its lift
  (1 hour, 30 minutes, 2 hours); `Run this one now` and `Drop this request` answered late do
  nothing, because that call was already queued.
- **FR-005**: The default and `Drop` are remembered for the band: while it lasts, later calls
  get the same answer without a new question. `Run this one now` is never remembered. A lift
  ends the question for its own length. The memory is cleared when usage leaves the band.
- **FR-006**: One question at a time. Calls of the same kind that arrive while it is open wait
  for its answer: `Run this one now` covers only the call that asked (the others are asked in
  turn), and after a lift every waiter goes through the cap of 1 again. A call of the other kind
  waits, then asks its own question. The cap check and the count of a running subagent are one
  write, so calls at once never all pass.
- **FR-007**: Claude cannot answer: the pick comes from a key press in the pane or the dialog,
  and no tool call, prompt or model turn picks. Hooks and plugins the person installed run with
  their trust; a `PreToolUse` hook on `AskUserQuestion` could answer the narrow-terminal dialog,
  and the README says so. The default is always the cautious path. A session with no one at the
  prompt (`isInteractive` false) is never asked.
- **FR-008**: A new boolean option `askOnLimit` (default true) turns the question off, which
  brings back the behavior of 0.9.2. With `governUsage` off, nothing asks.
- **FR-009**: Version 0.10.0; README (usage governance, options) and audit report updated.

## Tasks

- [X] T001 Failing unit tests in `tests/core/governor.test.ts`: both questions' answers and order, the ceilings for N and M, answers left out near 99%, a hold lift turning hold into throttle with cap 1
- [X] T002 Failing integration tests in `tests/integration/governor-ask.test.tsx`: each answer for hold and pause, the timeout, Esc, the remembered default, one question for concurrent calls, the `$.ui.ask` fallback with a late lift, `askOnLimit: false`
- [X] T003 Questions and lifts in `hooks/core/governor.ts`; `holdLift` and `asked` in `UsageState`, an `ask` key in the `$.state` contract (`types/index.d.ts`)
- [X] T004 The question flow, the pane and the fallback in `hooks/register.tsx`, drawn by `hooks/surfaces/ask.tsx`; `askOnLimit` in `.claude-plugin/plugin.json`
- [X] T005 README, audit report, version 0.10.0
