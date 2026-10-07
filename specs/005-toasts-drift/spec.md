---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Phase toasts and the drift alarm

**Feature Branch**: `005-toasts-drift`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "005-toasts-drift: phase-finished toasts and the drift alarm as
specified in the design doc (Toasts and drift section)"

## Overview

Two short notices keep the Spec Kit process honest. A phase toast says a feature moved to a
later phase, once, when the disk confirms it. The drift alarm says a task was ticked although
no code was edited since the previous tick, which usually means the checkbox got ahead of the
work.

## Clarifications

### Session 2026-10-07

The user asked for the flow to run without stopping; each recommended answer was accepted.

- Q: What do the toasts say? → A: Phase: `🧭 002 band-hint moved to tasks · next: /speckit-tasks`
  (or `🧭 002 band-hint is done · next: /speckit-specify`). Drift without named files:
  `🧭 T014 was ticked with no code edited since the last tick`. Drift with named files:
  `🧭 T014 was ticked, but none of its files were edited: tests/core/x.test.ts`.
- Q: Where is the phase baseline kept? → A: In `$.store`, one key per Spec Kit root, holding
  each feature's last seen phase. Nothing else is stored.
- Q: Which edits count as code? → A: Edit, Write and NotebookEdit of a file inside the project
  root and outside `specs/` and `.specify/`, by the main thread or a subagent.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A toast when a phase finishes (Priority: P1)

1. **Given** `preset: full` and feature 002 seen in `plan` earlier (stored baseline), **When**
   a reconcile finds it in `tasks`, **Then** one toast says it moved to `tasks` and names the
   next command.
2. **Given** the first reconcile of a session, **Then** no toast; the baseline is updated.
3. **Given** a skill hint alone suggests a new phase, **Then** no toast.
4. **Given** the same feature reaches the same phase again in the session, **Then** no second
   toast. A move back to an earlier phase never toasts.
5. **Given** `compact` or `minimal`, **Then** no phase toast.

### User Story 2 - The drift alarm (Priority: P1)

1. **Given** `compact` or `full`, **When** an Edit of `tasks.md` ticks T014 and no code file
   was edited since the previous tick (or session start), **Then** a drift toast appears.
2. **Given** `src/x.ts` was edited in that window, **Then** no toast.
3. **Given** T014's text names `tests/core/x.test.ts` and only `src/y.ts` was edited, **Then**
   the toast names the missing file.
4. **Given** a Bash or Agent call in the window, **Then** no toast (their edits are invisible).
5. **Given** a tick made outside Claude Code (no tool call), **Then** never a drift toast.
6. **Given** `minimal`, **Then** no toast.

### Edge Cases

- Several tasks ticked by one edit: one toast for the first of them, then the window resets.
- An edit of `tasks.md` that unticks: no toast, the window stays.
- Paths in tool calls are compared relative to the root, case-insensitively on Windows.

## Requirements *(mandatory)*

- **FR-001**: Phase toasts MUST compare each reconcile's derived phases with the stored
  baseline and toast only a move to a later phase (`specify < clarify < plan < tasks <
  implement < done`), at most once per `feature:phase` per session, never on the first
  reconcile of a session, never for abandoned features, and only with `toasts: all`.
- **FR-002**: The baseline MUST live in `$.store` under `baseline:<root>` and be updated at
  every reconcile.
- **FR-003**: The drift window MUST start at session start and at every tick transition, and
  record code edits (FR clarification) and whether any Bash or Agent call happened.
- **FR-004**: A tick transition is a task that was open in the held `tasks.md` text and is
  ticked in the text re-read after an observed Edit or Write of that file.
- **FR-005**: On a tick transition with `toasts` other than `none`, the mod MUST toast drift when
  the window has no Bash or Agent call and either the task names files of which none was
  edited, or it names none and no code file was edited.
- **FR-006**: The drift window and the toasted keys MUST live in memory only (session memo).
- **FR-007**: The README MUST describe both toasts with examples and say how to turn them off.

## Success Criteria *(mandatory)*

- **SC-001**: Every acceptance scenario has a passing test.
- **SC-002**: No toast in a session whose only change is a checkbox ticked in another editor.
- **SC-003**: `$.store` holds only `baseline:<root>` keys.

## Assumptions

- Edits made by Bash or by subagents' own shells are invisible; the alarm errs toward silence.
