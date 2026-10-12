---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Design Tokens

**Feature Branch**: `064-design-tokens`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "One visual vocabulary shared by every place Astrolabe draws: band, status entry, prompt hint, spinner, pane, toasts and the live table."

**Umbrella**: [063-design-review](../063-design-review/spec.md), tasks T001 to T010 (improvements #1 to #10).

**Design reference**: Claude Design canvas "Astrolabe — redesign" (https://claude.ai/code/artifact/65ee4724-d195-4e86-83e2-a438c2757e04), one-page viewer (https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL), static copy `docs/design/astrolabe-redesign.html`. Board 9 (`#b9`), column A, lists the ten items. The boards draw the terminal cell by cell in the mocha flavor; every colour on them is a role from `hooks/core/theme.ts`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read usage at a glance with one ramp (Priority: P1)

A user watches context, the 5-hour window, the 7-day window and the gateway spend limit. Every one of them uses the same colours and marks at the same levels, so "getting close" and "blocked" look the same wherever they appear.

**Why this priority**: Usage is what Astrolabe exists to warn about. Today the 7d chip shows 81% in peach with "hold", which reads as a caution while the governor is already blocking.

**Independent Test**: Render each usage value at 59, 60, 79, 80, 99 and 100 percent on every usage surface and compare colour role and mark.

**Acceptance Scenarios**:

1. **Given** a window at 59% with default thresholds, **When** it is drawn, **Then** it uses the done colour and no mark.
2. **Given** a window at 60% to 79%, **When** it is drawn, **Then** it uses yellow and the `▵` mark.
3. **Given** a window at 80% or more, **When** it is drawn, **Then** it uses the blocked colour and the `▴` mark.
4. **Given** a window at 100% or more, **When** it is drawn, **Then** it prints `full` beside the reset.
5. **Given** the 7d window at 81% with the governor on hold, **When** the chip is drawn, **Then** it reads `7d 81%▴ hold` in the blocked colour.
6. **Given** a per-window threshold set through `governThresholds`, **When** the window is drawn, **Then** the ramp levels move with that threshold.

---

### User Story 2 - Muted text stays readable (Priority: P1)

A user in any of the five flavors reads secondary text (hints, ids, timestamps) without squinting. Muted text uses a dedicated `faint` role that passes text contrast; the lower-contrast pending colour is kept for rules, separators and glyphs only.

**Why this priority**: The current muted colour is 3.4:1 on base and fails the 4.5:1 text minimum.

**Independent Test**: Run the contrast test over every text role in every flavor.

**Acceptance Scenarios**:

1. **Given** each flavor, **When** `faint` is measured against that flavor's base, **Then** the ratio is at least 4.5:1.
2. **Given** any muted text on any surface, **When** its role is inspected, **Then** it is `faint`, not the pending colour.
3. **Given** a rule, separator or state glyph, **When** its role is inspected, **Then** it may use the pending colour.

---

### User Story 3 - Rows never shift when state changes (Priority: P1)

A user watching a task or agent row sees a state change (running to paused to warning) without the row moving by a column. Glyphs that mark state are one cell wide in every icon set.

**Why this priority**: A shifting row makes live tables flicker and breaks column alignment.

**Independent Test**: Measure every glyph in the nerd, emoji-free and ascii icon sets with the shared width measure.

**Acceptance Scenarios**:

1. **Given** the paused, elapsed and warning states, **When** they are drawn, **Then** they use `‖`, `◷` and `▲`, not `⏸`, `⏱` or `⚠`.
2. **Given** every glyph in the nerd, emoji-free and ascii sets, **When** measured, **Then** each is one cell wide, except entries declared in the emoji set.

---

### User Story 4 - Ids are always whole and aligned (Priority: P1)

A user reads task ids and feature ids and can trust them: task ids appear as written in `tasks.md`, and feature ids line up and are never cut, whatever the width.

**Why this priority**: A cut or reformatted id cannot be searched for or matched to a file.

**Independent Test**: Render a project with 3-digit and 4-digit feature ids at 80, 100, 144 and 200 columns.

**Acceptance Scenarios**:

1. **Given** a task written as `T011`, **When** it is drawn anywhere, **Then** it reads `T011`, never `T11`.
2. **Given** a project whose widest feature id has 4 digits, **When** features are listed, **Then** shorter ids are padded to 4 digits.
3. **Given** a narrow width, **When** a row must shrink, **Then** other text is cut before an id is.

---

### User Story 5 - One language for time, phases, keys and messages (Priority: P2)

A user sees the same duration format, phase names, key meanings, message prefix and separators on every surface, so nothing has to be relearned between the band, the pane and the toasts.

**Why this priority**: Consistency, not a blocker. Each surface works today, just differently.

**Independent Test**: Compare the same value on every surface and check it is rendered the same way.

**Acceptance Scenarios**:

1. **Given** a duration of 40 seconds, 4 minutes 12 seconds or 2 hours 9 minutes, **When** it is drawn, **Then** it reads `40s`, `4m12s` or `2h09m`.
2. **Given** a reset less than a day away, **When** it is drawn, **Then** it counts down; **Given** one beyond a day, **Then** it names the weekday and time (for example `Thu 18:00`); **Given** an unknown reset, **Then** it prints `?`.
3. **Given** short space, **When** a phase is drawn, **Then** it uses `spec`, `clar`, `plan`, `tasks` or `impl`.
4. **Given** any tab, **When** a key from the shared set is pressed, **Then** it has the same meaning: `r` refresh, `q` run queued subagent, `?` help (`h` alias), `/` filter, `c` clear, `o` order, `p` priority, `a` advisor, space page, Esc close.
5. **Given** any toast or the status entry, **When** it carries a message, **Then** it starts with `astrolabe ✓ …` or `astrolabe ▲ …`, never `astrolabe:`.
6. **Given** a row with several zones, **When** it is drawn, **Then** `│` separates zones and `·` separates items inside a zone, and a single zone never contains both.

---

### User Story 6 - README shows every surface in the flavors (Priority: P3)

A reader of the README sees each surface in mocha and latte, and one capture each in frappe, macchiato and colorblind, with latte text that is readable.

**Why this priority**: Documentation catch-up. It follows the visual changes.

**Independent Test**: List the images the README references and compare with the surface and flavor matrix.

**Acceptance Scenarios**:

1. **Given** the README, **When** its images are listed, **Then** every surface appears in mocha and latte, and frappe, macchiato and colorblind each appear at least once.
2. **Given** the latte flavor, **When** its peach is used for text, **Then** it reaches 4.5:1 on the latte base.

---

### Edge Cases

- A usage value above 100% (spend limit overrun): prints `full` and keeps the blocked colour.
- A usage value that is unknown: no colour ramp and no mark; the value prints `?`.
- A threshold set to a value that crosses another level: the ramp orders the levels instead of drawing an inverted band.
- A feature id of five digits: padding extends to the widest id and the id is still never cut.
- A terminal without the glyphs of the nerd set: the ascii set is used and its glyphs are one cell wide.
- A reset exactly one day away: uses the weekday-and-time form.
- A flavor that cannot reach 4.5:1 with its matching overlay value: the test fails and the value is adjusted, not the threshold.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (#1): Context, 5h, 7d and the gateway spend limit MUST use one usage ramp taken from the governor's levels: done colour and no mark below 60; yellow with `▵` from 60 to below 80; blocked colour with `▴` from 80; `full` beside the reset at 100 or more.
- **FR-002** (#1): Per-window thresholds from `governThresholds` MUST move the ramp for that window.
- **FR-003** (#1): The 7d chip at 81% on hold MUST read `7d 81%▴ hold` in the blocked colour.
- **FR-004** (#2): The theme MUST provide a `faint` role for all muted text, equal to overlay2 in mocha and the matching value in each other flavor.
- **FR-005** (#2): Every flavor's `faint` MUST reach 4.5:1 on that flavor's base. The pending colour MUST be used only for rules, separators and glyphs.
- **FR-006** (#3): The paused, elapsed and warning glyphs MUST be `‖`, `◷` and `▲`.
- **FR-007** (#3): Every glyph in the nerd, emoji-free and ascii icon sets MUST measure one cell, except entries declared in the emoji set. The shared width measure MUST remain the single measure.
- **FR-008** (#4): Task ids MUST be drawn exactly as written in `tasks.md`.
- **FR-009** (#4): Feature ids MUST be padded to the widest id in the project and MUST NOT be cut at any width.
- **FR-010** (#5): Durations MUST use `40s`, `4m12s` and `2h09m`. A reset under a day MUST count down, a later one MUST name the weekday and time, and an unknown one MUST print `?`.
- **FR-011** (#6): Every surface MUST use one phase abbreviation table when space is short: specify→spec, clarify→clar, plan→plan, tasks→tasks, implement→impl.
- **FR-012** (#7): The key verbs in User Story 5 MUST mean the same on every tab.
- **FR-013** (#8): Toasts and the status entry MUST use the prefixes `astrolabe ✓ …` and `astrolabe ▲ …` only.
- **FR-014** (#9): `│` MUST separate zones and `·` MUST separate items inside a zone; one zone MUST NOT use both.
- **FR-015** (#10): The README MUST show every surface in mocha and latte and one capture each in frappe, macchiato and colorblind. Latte's peach used for text MUST reach 4.5:1.
- **FR-016**: No adapter MUST contain a literal colour; every colour comes from a theme role (Principle IX).
- **FR-017**: The README and its images MUST be regenerated in the same pull request (Principle II, quality gate 4).

### Key Entities

- **Usage ramp**: The mapping from a percentage and a window's thresholds to a colour role, a mark and an optional `full` label.
- **Theme role**: A named colour (for example `faint`, pending, done, blocked) with a value in each of the five flavors.
- **Flavor**: One of mocha, latte, frappe, macchiato and colorblind.
- **Glyph set**: The nerd, emoji-free or ascii set of state and decoration glyphs.
- **Phase abbreviation table**: The single mapping from phase name to short form.
- **Key verb table**: The single mapping from key to meaning shared by all tabs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Snapshot tests of band, status, footer, pane and live table pass in all five flavors at 80, 100, 144 and 200 columns.
- **SC-002**: The contrast test passes with zero text roles under 4.5:1 on their flavor's base, and fails if one is added below that.
- **SC-003**: The width test passes with zero state glyphs wider than one cell, and fails if one is added.
- **SC-004**: A usage value of 81% reads identically (colour role, mark) on every surface that shows it.
- **SC-005**: A search for `T11`-style short task ids, `astrolabe:` prefixes and the glyphs `⏸`, `⏱`, `⚠` across surfaces finds none.
- **SC-006**: No literal colour value appears in any adapter source.
- **SC-007**: The README lists all required captures and every referenced image exists.

## Assumptions

- The governor's levels (60, 80 and 100) and the `governThresholds` setting already exist and are the source for the ramp.
- Colorblind is the fifth flavor named in Principle IX, next to mocha, latte, frappe and macchiato. Nord and gruvbox stay out of scope.
- "Surfaces" are band, status entry, prompt hint, spinner, pane, toasts and live table, as named in the input.
- Existing surfaces that other child specs redesign (065 to 069) adopt these tokens as they are built; this spec supplies the tokens and brings existing surfaces in line.
- Test-first applies (Principle VI): the contrast, width and snapshot tests are written before the changes.
