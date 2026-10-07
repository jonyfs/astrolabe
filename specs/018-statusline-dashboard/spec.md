---
track: full # quick | full
status: done # active | done | abandoned
---

# Feature Specification: Astrolabe replaces the statusline

**Feature Branch**: `018-statusline-dashboard`
**Created**: 2026-10-07
**Status**: Draft
**Input**: "If Astrolabe has every feature of the current statusline, create a footer in the mod to show what is useful to keep always visible, because the statusline will be removed from the project. Improve the design, tabulation and look of Astrolabe with Nerd Fonts. Draw an astrolabe inside Astrolabe, with KPIs and charts that make sense, in a Dashboard tab for analysis."

## Context

The owner runs a separate statusline (three lines under the prompt) beside Astrolabe and wants to
remove it. Astrolabe shows Spec Kit progress and the usage window; the statusline also shows the
model and effort, the context window, both usage windows with their resets, the session cost and
duration, and the git state. This feature brings what is worth keeping always in view into
Astrolabe's own status entry under the prompt, gives every surface consistent icons, and adds a
Dashboard tab that turns what the session already knows into numbers and charts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One footer instead of the statusline (Priority: P1)

A developer removes the statusline and still sees, under the prompt, the Spec Kit position, the
model and effort, how full the context window is, the 5-hour and weekly windows with when they
reset, the session cost and duration, and the branch with how far it is from its upstream and how
many files are uncommitted.

**Why this priority**: it is the reason for the feature. Without it the statusline cannot go.

**Independent Test**: start a session in a Spec Kit project inside a git repository, run one turn,
and read the status entry: every part listed above is there, in a fixed order, and a narrower
terminal drops parts from the least important end instead of wrapping.

**Acceptance Scenarios**:

1. **Given** a git repository with 2 commits to push and 3 changed files, **When** a turn ends,
   **Then** the footer shows the branch with `↑2` and the 3 changes.
2. **Given** a reading of 5h 42% resetting at 14:00 and 7d 83%, **When** the footer is drawn,
   **Then** both windows show, each with its reset time, and the 7d one carries its band.
3. **Given** the model and effort of the last request, **When** the footer is drawn, **Then** they
   show (for example `opus 5.5 · high`).
4. **Given** a terminal too narrow for every part, **When** the footer is drawn, **Then** parts are
   dropped from the least important (session duration, cost, git counts, model) and the Spec Kit
   part and the binding usage window stay.
5. **Given** a project without git or Spec Kit, **When** the footer is drawn, **Then** the missing
   parts are left out, never shown empty.

---

### User Story 2 - Icons that fit the terminal (Priority: P2)

The footer, band and pane use Nerd Font glyphs in the terminal, emoji where no Nerd Font is
available (the Desktop app, VS Code, mobile), and plain ASCII when the person asks for it.

**Why this priority**: it makes the footer readable at a glance, but the footer works without it.

**Independent Test**: draw the footer with each value of the new `icons` option and on each surface;
every glyph comes from the chosen set and none is missing.

**Acceptance Scenarios**:

1. **Given** `icons: auto` in the terminal, **When** the footer is drawn, **Then** it uses Nerd Font
   glyphs.
2. **Given** `icons: auto` on the Desktop surface, **When** the band or pane is drawn, **Then** it
   uses emoji.
3. **Given** `icons: ascii`, **When** anything is drawn, **Then** every character is printable
   ASCII apart from the Spec Kit marks the band already uses.

---

### User Story 3 - A Dashboard tab (Priority: P2)

In the `/astrolabe` pane, a fourth tab shows the session at a glance: an astrolabe dial with the
active feature's place on the Spec Kit cycle, features by phase as bars, task progress, a line
chart of usage over the session with where it is heading at the reset, the burn rate, the context
window and cost, and session counts (turns, tool calls, drift alarms, subagents queued and run).

**Why this priority**: analysis on demand; it does not replace anything the person relies on today.

**Independent Test**: open the pane, press `4`, and read every KPI against what the session did:
3 turns, 12 tool calls, 1 drift alarm, and the usage readings given.

**Acceptance Scenarios**:

1. **Given** the active feature in `implement`, **When** the Dashboard is drawn, **Then** the dial
   points at `implement` among `specify`, `clarify`, `plan`, `tasks`, `implement` and `done`.
2. **Given** 10 usage readings rising from 40% to 60% with the reset 2 hours away, **When** the
   Dashboard is drawn, **Then** the chart shows the 10 points and the projection, and the burn rate
   reads in points per hour.
3. **Given** features in several phases, **When** the Dashboard is drawn, **Then** one bar per phase
   shows how many features are there.
4. **Given** a pane narrower than the charts, **When** it is drawn, **Then** the charts shrink, and
   below their minimum they are replaced by their numbers.
5. **Given** a session with no readings, **When** the Dashboard is drawn, **Then** the usage chart
   says there is no reading yet instead of drawing an empty chart.

### Edge Cases

- A detached HEAD, a branch with no upstream, a repository mid-merge: the git part shows what it
  knows (a short commit id, no arrows) and never an error.
- The git check fails or git is not installed: the git part shows the branch read from the file and
  nothing else.
- Cost is unknown (an API key without cost data): the cost part is left out.
- A window renewed (016): the footer says `renewed` as the status entry does now.
- A reload mid-session: counts and the chart's points survive, since they live in the session state.
- A very long session: the chart keeps its last points only, so the state does not grow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The status entry MUST carry, in this order, the Spec Kit part, the binding usage
  window and the other window with their resets, the context window, the model and effort, the git
  part (branch, ahead and behind, uncommitted files), the session cost and the session duration.
- **FR-002**: Each part MUST be left out when its data is missing, and the entry MUST fit the last
  known terminal width by dropping parts from the end of FR-001's order, never the Spec Kit part
  nor the binding window.
- **FR-003**: The git counts MUST come from one git query at the end of each main turn at most, run
  without a shell; when it fails or takes too long, the branch from the repository files stands.
- **FR-004**: A new option `icons` MUST take `auto` (default), `nerd`, `emoji` or `ascii`. `auto` is
  Nerd Font glyphs in the terminal and emoji on every other surface.
- **FR-005**: The pane MUST have a fourth tab, `Dashboard`, on hotkey `4`, with: the astrolabe dial,
  features by phase, the active feature's task progress, a usage line chart with the projection to
  the reset, the burn rate, the context window, the session cost, and the session counts (turns,
  tool calls, drift alarms, subagents queued and subagents run).
- **FR-006**: The session counts and the usage chart's points MUST be kept in the session's state,
  bounded (at most 60 chart points), written only when they change, and never read from disk while
  drawing.
- **FR-007**: Every chart MUST fit the pane's width, and below its minimum width show its numbers
  instead.
- **FR-008**: Colors MUST come from the theme's tokens (Catppuccin), and columns of labels and values
  MUST line up.
- **FR-009**: The README MUST document the footer (with a side-by-side map of what the statusline
  showed and where it is now, and what is left out), the `icons` option and the Dashboard, with
  images from the real mod, and the prose MUST go through the humanizer.
- **FR-010**: What the statusline shows that Astrolabe leaves out MUST be listed with the reason:
  the pull request and CI run (they need the network on every turn), the skills list (the band and
  the hint already show the running skill), the vim mode, the prompt cache timer and rtk savings.

### Key Entities

- **Footer part**: a label, its icon in each set, its value, and its rank for dropping.
- **Session counters**: turns, tool calls, drift alarms, subagents queued, subagents run, the
  session's start, the last model and effort, the last context and cost.
- **Usage series**: up to 60 points (time, percent) for the binding window, plus its reset.
- **Git state**: branch, upstream ahead and behind, changed files, conflicts.

## Success Criteria *(mandatory)*

- **SC-001**: With the statusline removed, every item the owner keeps always visible is in the
  footer, checked against the map in the README.
- **SC-002**: Drawing the footer, the band, the hint and the Dashboard reads no file and starts no
  process; the git query runs at most once per main turn.
- **SC-003**: At 80, 120 and 200 columns the footer never wraps, and the Spec Kit part and the
  binding window are always there.
- **SC-004**: Each Dashboard KPI matches what a scripted session did, in tests on the terminal and
  Desktop surfaces.
- **SC-005**: The state the feature adds stays under 4 KB however long the session runs.

## Assumptions

- The status entry under the prompt is the footer: Claude Code has no other site there, and it is
  one line of text, so its icons are characters, not colors.
- The terminal width comes from the last band or pane drawing; before any, 120 columns.
- Model and effort come from the last main-thread model request; cost and context from the
  session's own measure.
- A Nerd Font cannot be detected, so `auto` assumes one in the terminal, as the statusline did;
  `icons: emoji` or `ascii` is the way out.
- The owner removes the statusline from their settings themselves; Astrolabe does not touch them.
