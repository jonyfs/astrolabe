---
track: full # quick | full
status: done # active | done | abandoned
---

# Feature Specification: Usage governance

**Feature Branch**: `008-usage-governance`

**Created**: 2026-10-07

**Status**: Draft

**Input**: Original design: "It replaces jonyfs/statusline entirely and absorbs usage-governor
fully, including auto-resume." README roadmap: usage governance with the ok, throttle, hold,
stop and ceiling bands.

## Overview

Claude Code tells the mod how full the 5-hour and weekly windows are after every turn. Astrolabe
shows the highest one in the status entry and keeps subagent fan-out under the plan limits:
it caps concurrent subagents, holds new ones from 80%, pauses the session from 88% and resumes
it after the reset, and keeps a 90% ceiling that only the owner can lift.

## Clarifications

### Session 2026-10-07

The user asked for the flow to run without stopping; each recommended answer was accepted.

- Q: Where do the readings come from? → A: The engine's `session.measure` event
  (`rateLimits`: `kind`, `percentUsed`, `resetsAt`); no background probe.
- Q: How does a held dispatch resume? → A: Denied `Agent` calls are queued (description and
  prompt). When the window resets, Astrolabe submits one prompt listing them, so Claude
  dispatches them again. A running subagent is never stopped.
- Q: What does "pause" mean at stop and ceiling? → A: Every tool call except read-only ones
  (Read, Grep, Glob, LS, and the governor's own command) is refused with the reset time, and a
  resume prompt is scheduled for the reset.
- Q: Who lifts the ceiling? → A: Only a command the user types: `/astrolabe allow <percent>
  <duration>` (for example `allow 95 2h`), until the duration ends or the window resets;
  `/astrolabe revoke` ends it. A command from the model, a plugin or a script is refused.
- Q: Can it be turned off? → A: `userConfig` `governUsage` (default true). Off, Astrolabe only
  shows the windows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the windows (Priority: P1)

1. **Given** a measurement with 5h at 42% and 7d at 30%, **Then** the status entry ends with
   `· 5h 42%`; at throttle or above it also says the band, `· 5h 72% hold`… (see contract).
2. **Given** no reading (API key, no subscription), **Then** nothing is added and nothing is
   gated.

### User Story 2 - Fan-out under the cap (Priority: P1)

1. **Given** 65% (throttle, cap 3) and three subagents in flight, **When** a fourth `Agent` call
   comes, **Then** it is refused and queued with a message naming the cap.
2. **Given** 82% (hold), **Then** every new `Agent` call is refused and queued.
3. **Given** the window resets, **Then** one prompt is submitted listing the queued dispatches
   and the queue empties.

### User Story 3 - Pause at stop, ceiling for the owner (Priority: P1)

1. **Given** 89% (stop), **Then** non-read-only tool calls are refused until the reset, with
   the reset time, and a resume prompt is scheduled.
2. **Given** 91% (ceiling), **When** the user types `/astrolabe allow 95 2h`, **Then** stop and
   ceiling move to 95% for two hours or until the reset; new subagents still follow the 80%
   hold.
3. **Given** the same text submitted by a plugin or the model, **Then** it is refused.

## Requirements *(mandatory)*

- **FR-001**: The mod MUST keep the last `session.measure` readings and the time they arrived.
- **FR-002**: The band MUST come from the highest window: ok below 60, throttle 60 to 80 (cap 3
  below 70, cap 1 from 70, and cap 1 when the burn rate projects 80% or more before the reset),
  hold from 80, stop from 88, ceiling from 90; an owner override moves stop and ceiling to its
  target.
- **FR-003**: An `Agent` call MUST be refused and queued at hold and above, and at throttle when
  the in-flight count reaches the cap. In-flight counts the `Agent` calls whose result has not
  come back.
- **FR-004**: At stop and ceiling, every tool call except Read, Grep, Glob, LS, NotebookRead,
  WebFetch, WebSearch, TodoWrite and Skill MUST be refused with the reset time.
- **FR-005**: When the highest window's `resetsAt` passes, the mod MUST submit one resume prompt
  listing the queued dispatches (or saying the window renewed when the queue is empty and the
  session was paused), then clear the queue.
- **FR-006**: `/astrolabe allow <pct> <duration>` and `/astrolabe revoke` MUST work only when
  typed by the user (`origin.kind === 'composer'`), `pct` 90 to 99, duration `30m` to `12h`.
- **FR-007**: `governUsage: false` MUST stop all gating while still showing the windows.
- **FR-008**: The status entry MUST append the highest window as `5h 42%` or `7d 81%`, and the
  band name when it is not ok.
- **FR-009**: The README MUST document the bands, what each does, the resume, the owner command
  and the option.

## Success Criteria *(mandatory)*

- **SC-001**: No running subagent is ever stopped; only new calls are refused.
- **SC-002**: Without readings, no call is ever refused.
- **SC-003**: A non-user `allow` never changes the ceiling.

## Assumptions

- Subagents started in the background return their `Agent` result at once, so they do not count
  as in flight; the cap applies to foreground fan-out. Documented.
- The project's own `.claude/skills/usage-governor` hooks, when installed, govern too; the README
  says to keep one.
