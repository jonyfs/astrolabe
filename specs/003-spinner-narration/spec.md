---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Spinner narrates the current task

**Feature Branch**: `003-spinner-narration`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "003-spinner-narration: Spinner suffix with the current task and
its elapsed time (design doc spec sequence, item 3)"

## Overview

While Claude works on a Spec Kit feature, the spinner line says which task is in progress and
for how long, for example `Sauteing… T014 · write the parser tests · 3m`. The engine's own
word, time and token count stay; Astrolabe only adds the text after the word.

## Clarifications

### Session 2026-10-07

The user asked for the flow to run without stopping; each recommended answer was accepted.

- Q: When does the spinner narrate? → A: Only during a turn that works on the active feature:
  `/speckit-implement` was called in the turn, or a tool touched the active feature's
  directory in the turn. Other turns keep the plain spinner.
- Q: What does the elapsed time measure? → A: The time since the current task became the
  first open one in `tasks.md` (kept in memory for the session), shown as `45s`, `12m` or
  `1h 5m`.
- Q: How is the task text cleaned up? → A: The `[P]` and `[USn]` markers and backticks are
  removed, spaces collapsed, and the text is cut with `…` to fit; the id is never cut.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which task Claude is on (Priority: P1)

**Independent Test**: mount `Spinner` on terminal and desktop after a `speckit-implement`
call and read the `suffix` handed to the engine.

**Acceptance Scenarios**:

1. **Given** feature 002 in implement with current task `T014 [P] [US1] Write the parser
   tests in \`tests/core/x.test.ts\``, started 3 minutes ago, **When** the spinner draws during
   a turn that called `/speckit-implement`, **Then** the suffix is
   `… T014 · Write the parser tests in tests/core/x.test.ts · 3m`.
2. **Given** a turn that did not touch the active feature, **Then** the spinner is unchanged.
3. **Given** a task without an id, **Then** the suffix starts with its text.
4. **Given** a narrow terminal, **Then** the text is shortened with `…` and the id stays whole.
5. **Given** `preset: minimal`, no Spec Kit, or no open task, **Then** the spinner is unchanged.

### Edge Cases

- The engine's `message` override (for example while compacting): unchanged, the state's text
  wins.
- A task text with only markers: the suffix is the id and the time.
- Elapsed under a second: `0s`.

## Requirements *(mandatory)*

- **FR-001**: The mod MUST rewrite the Spinner's `suffix` only when the preset turns the
  spinner on, Spec Kit is present, the active feature has an open current task, the engine's
  `message` is null, and the turn ran `speckit-implement` or touched the active feature.
- **FR-002**: The suffix MUST be `… <id> · <text> · <elapsed>`, without `<id> · ` when the task
  has no id.
- **FR-003**: The text MUST drop `[P]`, `[US<n>]` and backticks and collapse spaces.
- **FR-004**: The suffix MUST fit the terminal: at most `columns - 40` characters when the
  surface reports columns, 80 otherwise, cutting only the text, with `…`; when even
  `… <id> · <elapsed>` does not fit, the spinner is unchanged.
- **FR-005**: Elapsed MUST be measured from the current task's `startedAt` and formatted
  `Ns` under a minute, `Nm` under an hour, `Nh Mm` above.
- **FR-006**: Drawing MUST read only `$.state` and the clock.
- **FR-007**: The README MUST describe the narration, when it shows and an example.

## Success Criteria *(mandatory)*

- **SC-001**: In tests on both surfaces the suffix matches FR-002 to FR-005 exactly.
- **SC-002**: With `minimal`, or in a turn that does not touch the active feature, the spinner
  props reach the engine unchanged.
- **SC-003**: Drawing the spinner performs zero file reads.

## Assumptions

- The engine re-runs the Spinner hook often enough for the elapsed time to read well; it is
  computed at each draw.
