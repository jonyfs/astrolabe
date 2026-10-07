---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: The /astrolabe pane

**Feature Branch**: `004-pane`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "004-pane: /astrolabe with tabs and hotkeys 1, 2 and 3, and the
unasked-open rule (design doc spec sequence, item 4)"

## Overview

Typing `/astrolabe` opens a pane with three tabs. Specs lists every feature with its phase
and progress. Tasks lists the active feature's open tasks. Session shows how Astrolabe sees
the project right now. With the `full` preset on a wide fullscreen terminal, the pane opens by
itself once.

## Clarifications

### Session 2026-10-07

The user asked for the flow to run without stopping; each recommended answer was accepted.

- Q: Which tabs ship? → A: Specs, Tasks and Session. Usage and Agents arrive with usage
  governance.
- Q: When does the pane open unasked? → A: With `preset: full`, at most once per session, at
  the end of the first turn after a band draw that reported a fullscreen viewport of 144
  columns or more. `session.start` reports no width, so the mod waits for one.
- Q: How many tasks does the Tasks tab list? → A: The open tasks in file order, as many as the
  pane's rows allow, then `+N more`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the pane and read every feature (Priority: P1)

**Independent Test**: run the `astrolabe` command, then mount `Pane` on terminal and desktop.

**Acceptance Scenarios**:

1. **Given** a Spec Kit project, **When** the user types `/astrolabe`, **Then** a pane titled
   `🧭 Astrolabe` opens on the Specs tab and the command answers `Astrolabe pane opened.`
2. **Given** the Specs tab, **Then** each feature has a row `<mark> <id> <name>  <phase>
   <bar> <percent>%`; the active one is marked `▸`, abandoned ones are dimmed, and warnings
   (a guessed active feature, clarification markers after the plan) are listed under the
   table.
3. **Given** no Spec Kit, **Then** the pane says `This project does not use Spec Kit.`

### User Story 2 - Switch tabs (Priority: P1)

1. **Given** the pane, **When** the user presses `2` (or clicks Tasks), **Then** the Tasks tab
   lists the active feature's open tasks with their ids, as many as fit, then `+N more`.
2. **When** the user presses `3`, **Then** Session shows root, constitution state, active
   feature and how it was chosen, next command, running skill, whether analyze ran, and the
   current task with its elapsed time.
3. **When** the user presses `1`, **Then** Specs shows again. The chosen tab is kept for the
   session.

### User Story 3 - Opens by itself on a wide screen with `full` (Priority: P2)

1. **Given** `preset: full`, a fullscreen viewport of 144 columns reported by the band, **When**
   the first turn ends, **Then** the pane opens once.
2. **Given** fewer than 144 columns, a non-fullscreen surface, or another preset, **Then** it
   does not open by itself.

### Edge Cases

- No active feature: Tasks says `No active feature.`; an active feature with no open tasks says
  `All tasks are ticked.`
- Narrow pane: rows cut with `…`; ids never cut.
- Surfaces without panes (VS Code, `-p`): the command still answers, nothing errors.

## Requirements *(mandatory)*

- **FR-001**: The mod MUST register the `astrolabe` command at session start; running it MUST
  open the pane `astrolabe` titled `🧭 Astrolabe` and answer `Astrolabe pane opened.`
- **FR-002**: The pane MUST draw three tab Buttons with hotkeys `1`, `2`, `3`; pressing one
  MUST switch the tab, kept in `$.state` for the session.
- **FR-003**: Specs, Tasks and Session MUST show what US1 and US2 describe, sized to
  `bodyColumns` and the viewport's rows, never cutting an id.
- **FR-004**: With `preset: full`, the pane MUST open unasked at most once per session, only
  after a band draw reported `isFullscreen` and `viewport.columns >= 144`, at the next main
  `turn.complete`.
- **FR-005**: Drawing MUST read only `$.state`; tasks come from the text already held in the
  session memo.
- **FR-006**: Colors MUST come from the flavor's tokens.
- **FR-007**: The README MUST document the command, each tab with an example, the hotkeys and
  the unasked-open rule.

## Success Criteria *(mandatory)*

- **SC-001**: Pane render tests pass on terminal and desktop for every tab.
- **SC-002**: The pane never opens unasked below 144 columns or outside `full`.
- **SC-003**: Drawing the pane performs zero file reads.

## Assumptions

- Usage and Agents tabs come with usage governance.
