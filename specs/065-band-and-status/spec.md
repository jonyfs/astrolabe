---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Band and Status

**Feature Branch**: `065-band-and-status`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Redesign the rows around the prompt so each fact appears in one place: seven chrome rows become three at 180 columns."

**Depends on**: [064-design-tokens](../064-design-tokens/spec.md). **Umbrella**: [063-design-review](../063-design-review/spec.md), tasks T011 to T020 (improvements #11 to #20).

**Design reference**: Claude Design canvas (https://claude.ai/code/artifact/65ee4724-d195-4e86-83e2-a438c2757e04), board 1 "Prompt chrome at 180 columns" and board 2 "Responsive: 200 · 144 · 100 · 80" (viewer https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL, anchors `#b1` and `#b2`; static copy `docs/design/astrolabe-redesign.html`).

## Target layout at 180 columns

Top to bottom:

1. **Spinner**, only while Claude works on the feature: `✻ T011 · Show an empty-cart message · 4m12s`.
2. **Band**, one row: feature id as an accent chip ` 002 `, the feature name in bold, finished steps as `✓ specify ✓ clarify ✓ plan ✓ tasks`, the current step as a peach chip ` ▶ implement 9/20 `, the task bar, then `│ ▸ T011 <title>`, and at the right edge the update Button and the hide Button. The constitution step appears only when the constitution is not ratified. The separate `updates:` row goes away.
3. **`next(e)`** right under the band (Principle VII).
4. **The prompt**, with the next command offered as a prompt suggestion.
5. **Status entry**: `astrolabe ◆ 002 implement 45% │ 7d 81%▴ hold · Mon 07:00`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know where the feature stands from one row (Priority: P1)

A user working on a feature reads one band row and knows the feature, the steps done, the current step with its count, and the task in hand, with no repeated facts elsewhere.

**Why this priority**: The band is on screen all session. Seven rows of chrome hide the prompt and repeat each other.

**Independent Test**: Mount the band at 180 columns with a feature at implement 9/20 and compare the row to board 1.

**Acceptance Scenarios**:

1. **Given** a full-track feature at implement 9 of 20, **When** the band is drawn at 180 columns, **Then** it shows the id chip, name, four finished steps, the ` ▶ implement 9/20 ` chip, the bar and the current task.
2. **Given** the constitution is ratified, **When** the band is drawn, **Then** no constitution step appears; **Given** it is not ratified, **Then** the step appears.
3. **Given** two or more pending updates are not in play, **When** the band is drawn, **Then** no separate `updates:` row exists.

---

### User Story 2 - A quick-track spec shows its real steps (Priority: P1)

A user on a quick-track spec sees `spec → tasks → impl`, with no clarify or plan steps marked done that never happened.

**Why this priority**: Marking skipped steps as done is untrue.

**Independent Test**: Draw the band for a spec with `track: quick`.

**Acceptance Scenarios**:

1. **Given** a spec with `track: quick`, **When** the band is drawn, **Then** the rail is `spec → tasks → impl`.
2. **Given** that rail, **When** it is drawn, **Then** clarify and plan appear nowhere.

---

### User Story 3 - The current step is one chip with its progress (Priority: P1)

A user sees the current step as a chip that holds `n/m`. Below 144 columns the percentage beside the bar is dropped because the chip already says it.

**Why this priority**: The count is the most useful number and must never be dropped.

**Independent Test**: Draw the band at 180, 143 and 100 columns.

**Acceptance Scenarios**:

1. **Given** implement at 9 of 20, **When** the band is drawn at any width, **Then** the chip holds `9/20`.
2. **Given** fewer than 144 columns, **When** the band is drawn, **Then** no separate percentage appears beside the bar.

---

### User Story 4 - Pause and hold take over the band (Priority: P1)

A user whose usage reaches the governor's pause level sees the band say so in the blocked colour, with the time it ends and a button to lift it for an hour. At hold level it says new subagents are held.

**Why this priority**: The user must know why work stopped and how to continue.

**Independent Test**: Draw the band with the governor at pause, then at hold.

**Acceptance Scenarios**:

1. **Given** the governor at pause level, **When** the band is drawn, **Then** it replaces the task with `‖ paused until 07:00` in the blocked colour and a `lift 1h` button.
2. **Given** the governor at hold level, **When** the band is drawn, **Then** it shows `‖ holding new subagents`.
3. **Given** the user presses `lift 1h`, **When** the next frame is drawn, **Then** the pause text is gone for that hour.

---

### User Story 5 - The next command appears once (Priority: P1)

A user sees the next command as the prompt suggestion while the prompt is empty. The hint shows it only when the prompt has text. It is never in both places.

**Why this priority**: Two copies of one fact add noise and disagree when one is stale.

**Independent Test**: Draw the prompt area empty, then with typed text.

**Acceptance Scenarios**:

1. **Given** an empty prompt, **When** the area is drawn, **Then** the next command is the prompt suggestion and the hint does not show it.
2. **Given** a prompt with text, **When** the area is drawn, **Then** the hint shows the next command and no suggestion is offered.

---

### User Story 6 - Status entry and pane share the load (Priority: P2)

A user with the footer in the pane sees only the lead in the status entry: feature, phase, percentage and the deciding window. The three-line footer belongs to the pane, and to the status entry only when the footer is set to the status.

**Why this priority**: Prevents the same footer drawing twice.

**Independent Test**: Draw the status entry with the footer set to pane, then to status.

**Acceptance Scenarios**:

1. **Given** `footerIn=pane`, **When** the status entry is drawn, **Then** it holds only the lead.
2. **Given** `footerIn=status`, **When** it is drawn, **Then** the three-line footer (spec 068) draws there.

---

### User Story 7 - No fact repeats between spinner, live table and band (Priority: P2)

A user sees the task named once in the spinner, agents and gates named once in the live table (069), and only counts in the band (`3 agents · 3 gates`).

**Why this priority**: Repetition is what made seven rows.

**Independent Test**: Run with an active task, three agents and three gates; search the chrome for each name.

**Acceptance Scenarios**:

1. **Given** an active task, three agents and three gates, **When** the chrome is drawn, **Then** the task title appears only in the spinner and the band shows `3 agents · 3 gates`.

---

### User Story 8 - Band chips open the files they name (Priority: P2)

A user clicks the feature id to open `spec.md` and a step to open its file (`plan.md`, `tasks.md`). Hover underlines the chip.

**Why this priority**: Direct navigation from the place the name is shown.

**Independent Test**: Draw the band and inspect each chip's target.

**Acceptance Scenarios**:

1. **Given** the band, **When** the feature id chip is activated, **Then** `spec.md` of the feature opens.
2. **Given** a finished step chip, **When** it is activated, **Then** that step's file opens.
3. **Given** the pointer over a chip, **When** it is drawn, **Then** the chip is underlined.

---

### User Story 9 - Quiet phase changes in the compact preset (Priority: P2)

A user on the compact preset sees a finished phase brighten its chip for 30 seconds instead of a second toast. The full preset keeps the toast.

**Why this priority**: Compact users asked for fewer interruptions.

**Independent Test**: Finish a phase under each preset.

**Acceptance Scenarios**:

1. **Given** the compact preset, **When** a phase finishes, **Then** its chip is brighter for 30 seconds and no toast appears.
2. **Given** the full preset, **When** a phase finishes, **Then** the toast appears.

---

### User Story 10 - Updates collapse and idle stays informative (Priority: P3)

A user with two or more pending updates sees one `⬆ 2` button that opens the list; one update keeps its name. After 10 idle minutes the one-line dimmed band still shows the deciding window.

**Why this priority**: Polish that keeps the band short.

**Independent Test**: Draw with one, then two updates pending; then advance 10 idle minutes.

**Acceptance Scenarios**:

1. **Given** one pending update, **When** the band is drawn, **Then** the button carries its name.
2. **Given** two or more, **When** it is drawn, **Then** one `⬆ 2` button opens the list.
3. **Given** 10 idle minutes, **When** the band is drawn, **Then** it is one dimmed line that still shows the deciding window.

---

### Edge Cases

- Open clarifications after plan: the step chip becomes a blocked `? clarify 2` chip (spec 042 #13 behaviour kept).
- `bandDensity` minimal at any width equals the 80-column row.
- A spec with no tasks yet: the chip holds no `n/m` and the bar is empty.
- A very long feature name: shed by the drop order, never the id.
- Governor at pause and a constitution step due: pause takes the task slot; the constitution step stays in the step area.
- No update pending: no update button.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (#11): For a spec with `track: quick`, the rail MUST be `spec → tasks → impl`, with clarify and plan never drawn or marked done.
- **FR-002** (#12): The current step MUST be a chip holding `n/m`. Below 144 columns the separate percentage beside the bar MUST be dropped.
- **FR-003** (#13): At the governor's pause level the band MUST replace the task with `‖ paused until <time>` in the blocked colour and a `lift 1h` button; at hold level it MUST show `‖ holding new subagents`.
- **FR-004** (#14): The next command MUST appear as the prompt suggestion while the prompt is empty and in the hint only when the prompt has text, never both.
- **FR-005** (#15): With `footerIn=pane` the status entry MUST hold only the lead: feature, phase, percentage and the deciding window.
- **FR-006** (#16): The spinner MUST name the task, the live table (069) MUST name agents and gates, and the band MUST show only counts.
- **FR-007** (#17): The feature id chip MUST open `spec.md` and each step chip MUST open its file; hover MUST underline. Chips MUST use the native link element (Principle IX).
- **FR-008** (#18): In the compact preset a finished phase MUST brighten its chip for 30 seconds instead of raising a second toast; the full preset MUST keep the toast.
- **FR-009** (#19): Two or more pending updates MUST collapse into one `⬆ N` button that opens the list; one update MUST keep its name.
- **FR-010** (#20): After 10 idle minutes the band MUST draw as one dimmed line that still shows the deciding window.
- **FR-011**: The band MUST NOT show the constitution step unless the constitution is not ratified.
- **FR-012**: The band MUST NOT draw a separate `updates:` row.
- **FR-013**: Responsive drop order for band and status MUST be: task title, then step names (marks `✓` remain, names on hover), then feature name, then the bar, then the update label (to `⬆N`).
- **FR-014**: The feature id, the current step, `n/m` and the deciding window MUST NOT be dropped at any width.
- **FR-015**: Open clarifications after plan MUST turn the step chip into a blocked `? clarify <n>` chip.
- **FR-016**: `bandDensity` minimal MUST equal the 80-column row at any width.
- **FR-017**: `next(e)` MUST be present right under the band at every width and density (Principle VII).
- **FR-018**: All colours MUST be theme roles (Principle IX); layouts MUST be sized from columns with ids never cut (Principle VIII); missing data MUST degrade honestly (Principle XI); nothing is written to the project or settings (Principle III); nothing slow runs on the draw path (Principle XII).
- **FR-019**: Strings MUST be English with i18n copies (Principle I).

### Key Entities

- **Band**: The one-row summary above the prompt: feature chips, step rail, current step, bar, task and buttons.
- **Step rail**: Ordered steps for a track (full: specify, clarify, plan, tasks, implement; quick: spec, tasks, impl).
- **Status entry**: The line under the prompt that carries the lead facts.
- **Deciding window**: The usage window that currently drives the governor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 180 columns the chrome is three rows (spinner while working, band, status entry) where it was seven.
- **SC-002**: Adapter tests on terminal and desktop at 80, 100, 144, 180 and 200 columns match the rows drawn on boards 1 and 2.
- **SC-003**: A test shows the band always includes the `next(e)` anchor at every tested width and density.
- **SC-004**: No fact (task, agent, gate, next command) appears in more than one place across spinner, live table, band, hint and status entry.
- **SC-005**: The feature id, current step, `n/m` and deciding window are present at 80 columns.
- **SC-006**: README sections "What the band shows", "What the status entry shows" and "The next command" are updated, with regenerated `overview-180` and `narrow-100` captures.

## Assumptions

- Spec 064 supplies the usage ramp, `faint` role, glyph set, duration format, phase abbreviations and separator rules used here.
- The live table (069) and the three-line footer (068) land after this spec; until then the band shows counts only where those sources exist.
- Board 2 holds the exact rows for 200, 144, 100 and 80 columns and is the reference for the responsive tests.
- The prompt suggestion mechanism already exists and is reused.
