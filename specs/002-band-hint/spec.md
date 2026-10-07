---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Band, prompt hint, presets and themes

**Feature Branch**: `002-band-hint`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "002-band-hint: band and prompt hint, presets, theme tokens,
userConfig (design doc spec sequence, item 2; approved wireframe docs/design/wireframe.html)"

## Overview

Feature 001 put one line of Spec Kit state in the shared status line. This feature draws the
same state where it is easier to read: a band directly above the prompt with a phase rail and
a progress bar, and a short hint after the engine's prompt hint naming the next Spec Kit
command. Presets decide which of these are on, and four Catppuccin flavors decide their
colors. Both are options in Claude Code's config menu.

## Clarifications

### Session 2026-10-07

The user asked for the Spec Kit flow to run without stopping, so each recommended answer
below was accepted as given.

- Q: What does the band show when Spec Kit is present but no feature is active? → A:
  Nothing; the band passes, and the prompt hint names the next command.
- Q: When does the prompt hint text appear? → A: Only while the prompt is empty, so it never
  competes with what the person is typing.
- Q: Do `compact` and `full` differ in this feature? → A: Not yet. Both draw the band and the
  hint; `full` also turns on the auto-opened pane and phase toasts, which arrive in features
  004 and 005. The preset data already declares them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every phase at a glance above the prompt (Priority: P1)

A developer in a Spec Kit project sees a band above the prompt, for example
`◆ 002 band-hint  constitution ● specify ● clarify ● plan ● tasks ● implement ◐  ████░░░░░░ 14/31 45%`.
Finished steps are filled, the current one is half filled, later ones are empty.

**Why this priority**: The rail is the differentiator of the design and the band is the
place with room for it.

**Independent Test**: Mount the band on the terminal and desktop surfaces with the
half-done fixture and read its text.

**Acceptance Scenarios**:

1. **Given** feature 002 at 14 of 31 tasks with a ratified constitution, **When** the band
   draws at 120 columns, **Then** it shows the id, the name, the six steps with five `●` and
   `implement ◐`, a ten-cell bar with four filled cells and `14/31 45%`.
2. **Given** feature 003 in phase `plan`, **Then** constitution, specify and clarify are `●`,
   plan is `◐`, tasks and implement are `○`, and no bar or count is shown.
3. **Given** a template constitution, **Then** constitution is `◐` and every later step `○`.
4. **Given** a guessed active feature, **Then** the id carries `~`.
5. **Given** `/speckit-plan` is running, **Then** the plan step shows `◐…`.
6. **Given** no `.specify/`, or no active feature, or a survey holding the band, **Then** the
   band draws nothing of its own and leaves the space to other mods.

---

### User Story 2 - The band fits any width (Priority: P1)

The band shrinks with the terminal or beside a docked pane, dropping detail in a fixed order,
and never cuts an id.

**Independent Test**: Draw at 80, 100, 144 and 200 columns and every width from 10 to 120;
the text never exceeds the width and always contains the whole id or is empty.

**Acceptance Scenarios**:

1. **Given** 100 columns, **Then** the band drops step labels except the current one before
   dropping anything else.
2. **Given** 40 columns, **Then** the band keeps the id and the marks.
3. **Given** fewer columns than `◆ 002`, **Then** the band shows nothing of its own.

---

### User Story 3 - The prompt hint names the next command (Priority: P1)

While the prompt is empty, the hint line ends with `next: /speckit-implement · 17 tasks left`
(or the command for the current phase). The engine's own hint stays.

**Independent Test**: Render `PromptHint` and read the `tail` passed to the engine.

**Acceptance Scenarios**:

1. **Given** phase `implement` with 17 open tasks, **Then** `tail` is
   `next: /speckit-implement · 17 tasks left`.
2. **Given** phase `plan`, **Then** `tail` is `next: /speckit-plan`.
3. **Given** a typed draft, no Spec Kit, or no next command, **Then** the hint is passed on
   unchanged.

---

### User Story 4 - Choose a preset and a flavor (Priority: P2)

In Claude Code's config menu the user picks `preset` (`minimal`, `compact`, `full`) and
`flavor` (`mocha`, `frappe`, `macchiato`, `latte`). `minimal` keeps only the status entry.

**Independent Test**: Run the band and hint tests with `{ preset: 'minimal' }` and with each
flavor, and compare the colors with the flavor's tokens.

**Acceptance Scenarios**:

1. **Given** `preset: minimal`, **Then** the band and the hint pass, and the status entry
   still shows.
2. **Given** `flavor: latte`, **Then** every colored element uses latte's hex values.
3. **Given** no options set, **Then** the defaults are `compact` and `mocha`.

### Edge Cases

- A phase `done` feature named by `feature.json`: all six marks `●`, the bar full.
- An `abandoned` feature named by `feature.json`: the band shows `◆ 003 band-hint abandoned`.
- A feature with tasks but phase before `implement` (tasks.md written before plan.md): the bar
  still shows when there are tasks.
- Very long feature names: the name is dropped before anything that carries meaning.
- `isWorking` true: the band still draws; it does not flicker per turn.
- Surfaces that draw no band (VS Code, `-p`): the hooks pass, nothing errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The mod MUST draw the band in `AbovePrompt` when Spec Kit is present, a feature
  is active, the preset turns the band on, and no survey holds the band.
- **FR-002**: The band MUST always include `await next(e)` among its children, and MUST return
  `next(e)` alone when it has nothing to show.
- **FR-003**: The rail MUST have six steps in this order: constitution, specify, clarify,
  plan, tasks, implement. Constitution is `●` when ratified and `◐` otherwise. For the feature
  steps, steps before the phase are `●`, the phase is `◐`, later steps `○`; phase `done` makes
  all `●`. When the constitution is not ratified, every feature step is `○`.
- **FR-004**: A running skill hint MUST add `…` after its step's mark.
- **FR-005**: When the feature has tasks, the band MUST show a ten-cell bar (`█` filled, `░`
  empty, filled cells `floor(done * 10 / total)`) and `done/total percent%`.
- **FR-006**: The band MUST fit `e.props.bodyColumns`, degrading in this order: all labels,
  then only the current step's label, then without the name, then without the bar, then
  without the count, then the id alone, then nothing. An id is never cut.
- **FR-007**: The mod MUST set the prompt hint's `tail` to `next: <command>` while the prompt is
  empty and a next command exists, adding ` · N tasks left` in phase `implement` with tasks.
  Otherwise the hint passes unchanged.
- **FR-008**: Presets MUST be data in `hooks/core/presets.ts`: for each of `minimal`, `compact`
  and `full`, which sites are on (status, band, hint, spinner, pane mode, toasts).
- **FR-009**: Colors MUST come only from theme tokens in `hooks/core/theme.ts`, defined for
  mocha, frappe, macchiato and latte with Catppuccin's hex values. No adapter holds a literal
  color.
- **FR-010**: `plugin.json` MUST declare `userConfig` `preset` (`minimal | compact | full`,
  default `compact`) and `flavor` (`mocha | frappe | macchiato | latte`, default `mocha`), each a
  picker in the config menu.
- **FR-011**: Drawing MUST only read `$.state`; no file reads, processes or network on the draw
  path.
- **FR-012**: The README MUST document the band (each part, with an example), the hint, both
  options with their values and defaults, how to change them, and add real captures at 100 and
  180 columns.

### Key Entities

- **Preset**: a name and the set of sites it turns on.
- **Theme tokens**: named roles (done, current, pending, accent, text, muted, bar fill, bar
  empty) mapped to hex per flavor.
- **Band layout**: the ordered segments of the band and the order they drop.

## Success Criteria *(mandatory)*

- **SC-001**: In every fixture the band's text matches the rail rules for both the terminal and
  desktop surfaces.
- **SC-002**: For every width from 10 to 200 columns the band's text is no wider than
  `bodyColumns` and never cuts an id.
- **SC-003**: With `preset: minimal` no band or hint text from the mod appears.
- **SC-004**: All four flavors produce colors only from their own token table.
- **SC-005**: Drawing the band performs zero file reads.

## Assumptions

- Claude Code draws hex colors; how they look on terminals without truecolor is Claude
  Code's choice and is noted in the README.
- The band's spinner narration, the pane and toasts belong to 003, 004 and 005.
- Git, model, context and usage rows of the classic statusline are out of scope here.
