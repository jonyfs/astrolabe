---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: The governor's question never blocks a hook

**Created**: 2026-10-07 · **Source**: found while reviewing 015 against the engine types (`HookBudget`)

## Problem

In 0.10.0 and 0.11.0 the gate waited inside the `tool.call` hook for the person's answer, up to
60 seconds. Claude Code gives a hook 10 seconds (`HookBudget.ms`), and that clock runs while a
hook awaits anything but a `$` or `next` call. Past it the hook is skipped and its `.catch`
runs, which passes the call. So an unanswered question let the subagent or the tool through at
about 10 seconds, the opposite of the cautious default. The tests used a mock clock and answered
at once, so they never saw it.

## Requirements

- **FR-001**: The gate MUST answer at once: at hold it queues the subagent, at stop or the
  ceiling it refuses the tool, as without the question. The refusal says the person is being
  asked and not to retry.
- **FR-002**: The question MUST open from a `$.clock.after` timer, in the plugin's own time, one
  at a time. Calls that arrive while it is open are refused with the default and are not asked.
- **FR-003**: Each answer acts when it comes: the default is remembered for the band; `drop`
  takes the call out of the queue and is remembered; `run` takes it out, grants a one-time pass
  for its exact prompt, and submits a prompt telling Claude to send it again; a lift (`lift`,
  `extend`, `raise`) sets the lift and resumes what waits.
- **FR-004**: A pass is used once, by the next main-thread `Agent` call with the same prompt,
  and passes are dropped when the hold ends.
- **FR-005**: After 60 seconds or Esc the pane closes and the default stands. In the narrow
  terminal dialog, which cannot be closed, an answer applies whenever it comes.
- **FR-006**: Version 0.11.1; README, the 015 spec note and the audit report updated.

## Tasks

- [X] T001 Tests in `tests/integration/governor-ask.test.tsx` that fail on 0.11.0 (the call must be refused before any answer, with no clock advance)
- [X] T002 `askLater`, `askNow` and `answer` in `hooks/register.tsx`; `runPrompt` in `hooks/core/governor.ts`; `passes` in `types/index.d.ts`
- [X] T003 README, the 015 note, audit report, version 0.11.1
