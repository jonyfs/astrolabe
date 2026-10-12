---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Pane in Five Tabs

**Feature Branch**: `066-pane-five-tabs`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Reorganize the /astrolabe pane from eight tabs to five, separate tabs from tools, and redesign the Specs, Tasks, Session and Setup bodies."

**Depends on**: [064-design-tokens](../064-design-tokens/spec.md). **Umbrella**: [063-design-review](../063-design-review/spec.md), tasks T021 to T030 (improvements #21 to #30).

**Design reference**: Claude Design canvas (https://claude.ai/code/artifact/65ee4724-d195-4e86-83e2-a438c2757e04), board 3 "Pane: Specs and Tasks", board 4 "Pane: Session and Setup", board 5 "Tabs, toasts and questions" (viewer https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL, anchors `#b3`, `#b4`, `#b5`; static copy `docs/design/astrolabe-redesign.html`).

## Today and target

Today the tab row reads `[ ▸ Specs 15 ][ Tarefas 2 ][ Sessão ][ Painel ][ Ajuda ][ Config ][ PRs 1 ][ Modelos ]h: ? hf: ⌕ fs: s todas p: ↑↓ po: o`: two tabs per subject, help as a tab, a total shown as a badge, and button hotkeys leaking into labels.

Pane layout, top to bottom: title row `🧭 Astrolabe · <id> <name>` with the close button; tab row; legend row (keys and verbs of the tab shown); rule; body; rule; pinned footer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Five tabs, one subject each (Priority: P1)

A user opens the pane and finds five tabs with hotkeys 1 to 5: Specs, Tasks, Session, PRs and Setup. Help opens as an overlay on `?`.

**Why this priority**: Eight tabs split subjects in two and put help in the same row as work.

**Independent Test**: Open the pane and read the tab row; press 1 to 5 and `?`.

**Acceptance Scenarios**:

1. **Given** the pane, **When** it opens, **Then** the tab row holds Specs, Tasks, Session, PRs and Setup, reachable with 1 to 5.
2. **Given** any tab, **When** `?` (or `h`) is pressed, **Then** a help overlay opens and the tab row is unchanged.
3. **Given** a stored last tab of `dashboard`, **When** the pane opens, **Then** Session is shown; **Given** `config`, **Then** Setup is shown.
4. **Given** a project, **When** the pane is reopened, **Then** the last tab per project is restored as today.

---

### User Story 2 - Tabs row has tabs; legend row has keys (Priority: P1)

A user sees tabs only in the tab row and the keys of the current tab in the legend row as `key verb` pairs. No label carries a hotkey prefix.

**Why this priority**: Mixing tools into the tab row is what made it unreadable.

**Independent Test**: Draw each tab and inspect both rows.

**Acceptance Scenarios**:

1. **Given** the Specs tab, **When** drawn, **Then** the legend row reads like `/ filter  s in progress  o by progress  p priority  a advisor`.
2. **Given** any label, **When** inspected, **Then** it carries no `hf:` or `po:` style prefix.
3. **Given** the desktop surface, **When** a button has a hotkey, **Then** the button draws the hotkey itself.

---

### User Story 3 - Badges show what needs me (Priority: P1)

A user sees a badge only where something waits: Specs shows features in progress, Tasks shows open tasks of the active feature, PRs shows open pull requests, Session shows `▲` only while the governor holds or pauses.

**Why this priority**: A total says nothing about what to do next.

**Independent Test**: Draw the tab row with and without waiting items.

**Acceptance Scenarios**:

1. **Given** nothing waits, **When** the tab row is drawn, **Then** no badge appears.
2. **Given** 2 features in progress, 11 open tasks and 1 open PR, **When** drawn, **Then** badges read 2, 11 and 1.
3. **Given** the governor holds or pauses, **When** drawn, **Then** Session shows `▲`.

---

### User Story 4 - The selected spec is a block with its actions (Priority: P1)

A user sees the selected spec in Specs as a block on a surface background: its row, then `11 left · ? 1 question · checklist 2 open · ⎇ wt-cart`, then `[ ▶ /speckit-implement ] [ ⧉ copy ] [ ✦ advisor ]`, then the gstack skills for its phase when gstack is installed.

**Why this priority**: The actions belong next to the spec they act on.

**Independent Test**: Select a spec in implement phase and compare to board 3.

**Acceptance Scenarios**:

1. **Given** a selected spec, **When** drawn, **Then** it shows the row, the counts line, the three actions and, with gstack installed, the phase's gstack skills.
2. **Given** gstack is not installed, **When** drawn, **Then** the gstack line is absent.

---

### User Story 5 - Predictable sections and honest empty states (Priority: P2)

A user finds Specs sections in a fixed order and, on an empty tab, reads what fills it and the command that does, including in a project without Spec Kit.

**Why this priority**: Fixed order lets users find things by position; empty states teach.

**Independent Test**: Draw Specs with all sections; draw each tab empty; draw in a project without Spec Kit.

**Acceptance Scenarios**:

1. **Given** specs in every state, **When** Specs is drawn, **Then** sections are Active, In progress, Early, Ready to close, Next up, Done (folded), Abandoned (folded), in that order.
2. **Given** an empty tab, **When** drawn, **Then** it names what fills it and the command that does.
3. **Given** a project without Spec Kit, **When** a tab is drawn, **Then** its empty state says so and names the command to start (Principle XI).

---

### User Story 6 - Setup groups options and marks changes (Priority: P2)

A user finds options under Look, Usage governor, Claude and Model per skill. A non-default value carries `•` and the default shows on hover. A footnote says changes save to the mod store and nothing writes `settings.json`.

**Why this priority**: Lets a user see what they changed.

**Independent Test**: Change one option and draw Setup.

**Acceptance Scenarios**:

1. **Given** Setup, **When** drawn, **Then** options are grouped under the four headings.
2. **Given** a non-default option, **When** drawn, **Then** it carries `•` and hover shows the default.
3. **Given** Setup, **When** drawn, **Then** a footnote states that changes save to the store and nothing writes settings.

---

### User Story 7 - PRs as a table (Priority: P2)

A user reads pull requests as a table: number, title, draft, labels, review state and checks as `✓ ✖ ◷` cells, each row a link.

**Why this priority**: Pull requests are tabular data.

**Independent Test**: Draw PRs with several open pull requests.

**Acceptance Scenarios**:

1. **Given** open pull requests, **When** PRs is drawn, **Then** each row shows number, title, draft, labels, review state and checks cells.
2. **Given** a row, **When** activated, **Then** it opens the pull request.

---

### User Story 8 - Help overlay and a title that explains (Priority: P3)

A user opens the help overlay and finds keys grouped by tab and one example per filter of the Specs filter language. The pane title says why the spec is active: `feature.json`, branch, or highest open spec.

**Why this priority**: Discoverability and trust.

**Independent Test**: Open help; draw the title in each of the three cases.

**Acceptance Scenarios**:

1. **Given** the help overlay, **When** drawn, **Then** keys are grouped by tab and each Specs filter has one example.
2. **Given** an active spec chosen by `feature.json`, branch or highest open spec, **When** the title is drawn, **Then** it says which.

---

### User Story 9 - Tasks tab shows the work in hand (Priority: P1)

A user reads in Tasks: a header `002 shopping-cart · implement · 9/20 · ≈1h20 left`; a warning row when open tasks pass the 5h reset; the current task bold with `◷ 4m12s` at the right edge and its files under it; user-story sections with their own count (`US3 Cart page 0/5`); parallel runs as a `┐┤┘` bracket with `P`; and done tasks folded to `✓ 9 done · T001…T009 · 52m`.

**Why this priority**: The Tasks tab is where the user decides what to do next.

**Independent Test**: Draw Tasks for a feature at 9 of 20 and compare to board 3 (right).

**Acceptance Scenarios**:

1. **Given** a feature at implement 9/20, **When** Tasks is drawn, **Then** the header, current task with elapsed time and files, story sections with counts, parallel brackets and the folded done line match board 3.
2. **Given** open tasks that will pass the 5h reset, **When** drawn, **Then** a warning row appears.

---

### User Story 10 - Session tab shows usage and the governor (Priority: P2)

A user reads in Session: usage rows for ctx, 5h and 7d as 20-cell bars with `┊` ticks at the governor levels; a 24-hour cell chart of the 7d window with the projection to reset in dashed cells; a round-bordered governor box (state in words, the queue with `run now` buttons, `lift 1h` and `revoke`, today's holds and pauses); KPI chips; constitution and review rows.

**Why this priority**: Replaces two tabs with one clearer view.

**Independent Test**: Draw Session with a held governor and a queue and compare to board 4 (left).

**Acceptance Scenarios**:

1. **Given** usage data, **When** Session is drawn, **Then** ctx, 5h and 7d bars show ticks at the governor levels.
2. **Given** a queued subagent, **When** drawn, **Then** the governor box lists it with a `run now` button, plus `lift 1h` and `revoke`.

---

### User Story 11 - Tabs fit the width, toasts and questions stay short (Priority: P2)

A user at 100 or more pane columns sees full labels; at 80 columns the legend shortens verbs and keeps keys; under 60 columns labels become number and badge (`2·11 3▲ 4·1`). Toasts are one line and only for state changes. The governor question uses the ask dialog with the cautious answer already applied.

**Why this priority**: The pane must work in narrow splits.

**Independent Test**: Draw the tab row at 100, 80 and 59 columns; raise a governor question.

**Acceptance Scenarios**:

1. **Given** 100, 80 and 59 pane columns, **When** the tab row is drawn, **Then** labels are full, legend verbs are short with keys kept, and labels are number plus badge, respectively.
2. **Given** a state change, **When** a toast is raised, **Then** it is one line, such as `astrolabe ✓ 002 tasks done · next /speckit-implement`.
3. **Given** a queued subagent at 81%, **When** the governor asks, **Then** the prompt reads `‖ 7d at 81%▴ · code-reviewer is queued until Mon 07:00` with options `1. Keep it queued (applied)`, `2. Run it now`, `3. Lift holds for 1 hour`, and the first is already applied.

---

### Edge Cases

- A stored last tab that names a removed tab (`dashboard`, `config`, `models`): maps to its new tab; an unknown value falls back to Specs.
- A project with no features: Specs and Tasks show their empty state with the command that fills them.
- No open pull requests or no `gh`: PRs shows an empty state that names the cause.
- A pane narrower than 60 columns: number and badge only; the title row still shows the id.
- All badges at zero: no badge draws, no `0`.
- Every existing `/astrolabe` subcommand keeps working after the change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (#21): The pane MUST have five tabs with hotkeys 1 to 5: Specs, Tasks, Session (today's Session and Dashboard), PRs and Setup (today's Config and Models).
- **FR-002** (#21): Help MUST open as an overlay on `?`, with `h` kept as an alias, and MUST NOT be a tab.
- **FR-003** (#21): The last tab per project MUST be remembered as today, and a stored `dashboard` or `config` MUST map to its new tab.
- **FR-004** (#22): The tab row MUST hold tabs only. Filter, status, order, priority and advisor MUST move to the legend row as `key verb` pairs.
- **FR-005** (#22): No label MUST carry a button's hotkey prefix; on the desktop surface the button MUST draw its hotkey itself.
- **FR-006** (#23): Badges MUST count what needs the person: Specs = features in progress, Tasks = open tasks of the active feature, PRs = open pull requests, Session = `▲` only while the governor holds or pauses. No badge MUST show when nothing waits, and none shows a total.
- **FR-007** (#24): The selected spec in Specs MUST render as a block on a surface background: its row, a counts line, three actions (`▶ /speckit-implement`, `⧉ copy`, `✦ advisor`) and, when gstack is installed, the gstack skills for its phase.
- **FR-008** (#25): Specs sections MUST be ordered Active, In progress, Early, Ready to close, Next up, Done (folded), Abandoned (folded).
- **FR-009** (#26): Each tab MUST have an empty state that names what fills it and the command that does, including for a project without Spec Kit.
- **FR-010** (#27): Setup MUST group options under Look, Usage governor, Claude and Model per skill; a non-default value MUST carry `•`, the default MUST show on hover, and a footnote MUST say changes save to the store and nothing writes `settings.json`.
- **FR-011** (#28): PRs MUST be a table of number, title, draft, labels, review state and checks cells (`✓`, `✖`, `◷`), each row a link.
- **FR-012** (#29): The help overlay MUST group keys by tab and give one example per filter of the Specs filter language.
- **FR-013** (#30): The pane title MUST say why the spec is active: `feature.json`, branch, or highest open spec.
- **FR-014**: Tasks MUST show the header, warning row, current task with elapsed time and files, story sections with counts, parallel brackets and the folded done line described in User Story 9.
- **FR-015**: Session MUST show the usage bars with governor ticks, the 24-hour chart with projection, the governor box, KPI chips and constitution and review rows described in User Story 10.
- **FR-016**: Tabs MUST adapt by pane width: full labels at 100 or more columns, shortened legend verbs with keys kept at 80, number plus badge under 60.
- **FR-017**: Toasts MUST be one line and only for state changes (Principle VII).
- **FR-018**: The governor question MUST use the ask dialog with the cautious answer already applied.
- **FR-019**: Every `/astrolabe` subcommand MUST keep working; no command or option is removed.
- **FR-020**: All colours MUST be theme roles (Principle IX); nothing slow runs on the draw path (Principle XII).

### Key Entities

- **Tab**: One of Specs, Tasks, Session, PRs, Setup, with a hotkey, label, badge and legend.
- **Legend row**: The `key verb` pairs of the tab shown.
- **Spec block**: The expanded selected-spec area in Specs.
- **Badge**: A count or mark showing what waits on the person.
- **Governor box**: The Session panel showing governor state, queue and controls.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The tab row has five entries where it had eight, and no help tab.
- **SC-002**: Pane adapter tests on terminal and desktop at 60, 80 and 100 pane columns pass for each tab.
- **SC-003**: A migration test shows stored `dashboard` and `config` values open Session and Setup.
- **SC-004**: i18n keys for en, pt-BR, es and fr fit the same widths as the English strings.
- **SC-005**: No label in any tab row contains a hotkey prefix.
- **SC-006**: README section "The /astrolabe pane" and the `pane-specs`, `pane-tasks` and `pane-session` captures are regenerated.
- **SC-007**: All `/astrolabe` subcommands that worked before still work.

## Assumptions

- Spec 064 supplies tokens used here (usage ramp, `faint`, glyph set, key verbs, separators).
- The mod store (`$.store`) already holds per-project last tab and settings.
- This is a MAJOR change under the constitution's versioning rule only if a command or option is removed; none is.
- The Specs scale features (focus view, blocks, checks) are spec 067 and build on this tab layout.
- Board 3, 4 and 5 hold the exact rows used by the tests.
