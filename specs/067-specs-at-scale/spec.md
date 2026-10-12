---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Specs at Scale

**Feature Branch**: `067-specs-at-scale`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Make the Specs tab work for projects with 100 or more specs, and surface data drift found in real projects."

**Depends on**: [066-pane-five-tabs](../066-pane-five-tabs/spec.md). **Umbrella**: [063-design-review](../063-design-review/spec.md), tasks T031 to T040 (improvements #31 to #40).

**Design reference**: Claude Design canvas (https://claude.ai/code/artifact/65ee4724-d195-4e86-83e2-a438c2757e04), board 6 "Specs at scale" (viewer https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL, anchor `#b6`; static copy `docs/design/astrolabe-redesign.html`). The board is drawn from this repository's real specs folder at commit 9f14e2d: 64 folders, 49 done, 6 implementing, 3 early, 6 ready to close.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A view that keeps its height at any scale (Priority: P1)

A user toggles with `v` between Focus (default) and All. Focus lists only Early, In progress and Ready to close, with Done counted per block (`Done 49 ▸ 001–050 42 · 051–100 7`), so its height is the same at 64, 200 or 1000 specs. All lists every spec in blocks of 50 by id (`▾ 001–050 ✓42 ▶6 ·2 ⚠3`), opened and folded with `←` and `→`. `#` opens a jump field with live completion of ids (`# 05 → 050 051 … 059`).

**Why this priority**: A flat list is unusable past a few dozen specs.

**Independent Test**: Draw Focus with 64, 200 and 1000 fixture specs and count rows; open All and fold a block; type `05` in the jump field.

**Acceptance Scenarios**:

1. **Given** 64, 200 or 1000 specs, **When** Focus is drawn, **Then** the number of rows is the same.
2. **Given** All, **When** drawn, **Then** specs are grouped in blocks of 50 by id with per-block counts, and `←` and `→` fold and open the block under the cursor.
3. **Given** the jump field with `05`, **When** drawn, **Then** it lists the matching ids and Enter moves to the chosen one.

---

### User Story 2 - Know which specs are ready to close (Priority: P1)

A user sees a Ready to close section for every spec whose tasks are all ticked while its front matter still says `status: active` (today 044, 045, 046, 048, 051, 053). The action offers the front-matter edit to Claude through a prompt suggestion; Astrolabe writes nothing to the project.

**Why this priority**: Closed work that stays active clutters every view.

**Independent Test**: Use a fixture with a fully ticked active spec.

**Acceptance Scenarios**:

1. **Given** a spec with every task ticked and `status: active`, **When** Specs is drawn, **Then** it is in Ready to close.
2. **Given** the user activates its action, **When** it runs, **Then** a prompt suggestion proposes the front-matter edit and no project file is written by Astrolabe.

---

### User Story 3 - Surface data drift in a checks row (Priority: P1)

A user sees a checks row under the summary: `⚠ 3 checks · 028 done with 1/30 ticked · ids 029 and 030 used twice`. It covers status `done` with open tasks, duplicate ids, a dangling or malformed `feature.json`, and files named in `plan.md` that do not exist. Each check also sits under its own spec's row.

**Why this priority**: Drift is invisible until it bites.

**Independent Test**: Use a fixture with one of each drift.

**Acceptance Scenarios**:

1. **Given** a done spec with open tasks, **When** drawn, **Then** the checks row counts it and names the spec and the ratio.
2. **Given** a dangling `feature.json`, **When** drawn, **Then** the checks row reports it.
3. **Given** a check, **When** the spec's row is drawn, **Then** the same check appears under that row.

---

### User Story 4 - Duplicate ids stay visible (Priority: P1)

A user with two folders sharing an id sees both as separate rows marked `⚠ id×2`, and the jump lists both.

**Why this priority**: Hiding one folder hides real work.

**Independent Test**: Use a fixture with ids 029 and 030 used twice.

**Acceptance Scenarios**:

1. **Given** two folders with id 029, **When** drawn, **Then** two rows appear, each marked `⚠ id×2`.
2. **Given** the jump field with `029`, **When** drawn, **Then** both folders are listed.

---

### User Story 5 - Long lists say where you are (Priority: P2)

A user sees a thumb `┃` on the right edge of every scrolling list and `rows a–b of n` in the filter row, with only visible rows drawn.

**Why this priority**: Orientation and speed in long lists.

**Independent Test**: Draw a list longer than the viewport and scroll.

**Acceptance Scenarios**:

1. **Given** a list longer than the viewport, **When** drawn, **Then** a thumb `┃` marks the position and the filter row shows `rows a–b of n`.
2. **Given** a scroll, **When** drawn, **Then** only the visible rows are drawn.

---

### User Story 6 - Deferred reads never leave a blank (Priority: P2)

A user at session start, while older specs are not yet read (spec 040: twenty newest first), sees one placeholder row per run: `· 040–049 not read yet · reading in the background`.

**Why this priority**: A blank looks like missing data.

**Independent Test**: Start with deferred reads and draw before they finish.

**Acceptance Scenarios**:

1. **Given** deferred specs, **When** drawn, **Then** one placeholder row per consecutive run appears with the id range.
2. **Given** the background read finishes, **When** drawn, **Then** the placeholder is replaced by the real rows.

---

### User Story 7 - Unknown figures say unknown (Priority: P2)

A user never sees `0%` or a blank for a figure that is absent: `?%` or `?` prints instead. A window at 100% prints `full` beside its reset.

**Why this priority**: A false zero misleads.

**Independent Test**: Draw a spec with no task data and a window at 100%.

**Acceptance Scenarios**:

1. **Given** a spec with no tasks file, **When** drawn, **Then** its percentage prints `?%`.
2. **Given** a window at 100%, **When** drawn, **Then** `full` prints beside its reset.

---

### User Story 8 - Grouping and session activity (Priority: P3)

A user presses `g` to cycle grouping: status, phase, track, priority. A "Touched this session" section lists specs Claude read or edited this session, taken from tool events held in the mod state.

**Why this priority**: Convenience on top of the base view.

**Independent Test**: Press `g` four times; read a spec file in a session and draw.

**Acceptance Scenarios**:

1. **Given** Specs, **When** `g` is pressed, **Then** grouping cycles status, phase, track, priority and back.
2. **Given** Claude read or edited a spec this session, **When** drawn, **Then** it appears under "Touched this session".

---

### Edge Cases

- Fewer than 50 specs: one block, no fold marks.
- 1000 specs: Focus height unchanged; All shows 20 blocks.
- A spec id with 4 digits next to 3-digit ids: blocks and jump still sort and match.
- A `feature.json` naming a folder that does not exist: reported as a check, not an error.
- A main branch with no `feature.json`: the pane title reads `059 hud-display` with the detail `active: highest open spec (no feature.json, branch main)` (Principle V).
- A fixture spec both duplicated and done with open tasks: both checks appear.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (#31): `v` MUST toggle Focus (default) and All. Focus MUST list only Early, In progress and Ready to close, with Done counted per block, at a height independent of the number of specs.
- **FR-002** (#31): All MUST list every spec in blocks of 50 by id with counts, folded and opened with `←` and `→`. `#` MUST open a jump field with live id completion.
- **FR-003** (#32): Ready to close MUST list every spec with all tasks ticked and `status: active`. Its action MUST suggest the front-matter edit through a prompt suggestion; Astrolabe MUST NOT write to the project.
- **FR-004** (#33): A checks row MUST sit under the summary and cover status `done` with open tasks, duplicate ids, dangling or malformed `feature.json`, and files named in `plan.md` that do not exist. Each check MUST also appear under its own spec's row.
- **FR-005** (#34): Duplicate ids MUST keep both folders as separate rows marked `⚠ id×2`, and the jump MUST list both.
- **FR-006** (#35): Every scrolling list MUST draw a thumb `┃` on the right edge and `rows a–b of n` in the filter row, drawing only visible rows.
- **FR-007** (#36): Specs deferred at session start MUST show one placeholder row per run, `· 040–049 not read yet · reading in the background`, never a blank.
- **FR-008** (#37): Absent figures MUST print `?%` and `?`, never `0%` or blank.
- **FR-009** (#38): A window at 100% MUST print `full` beside its reset.
- **FR-010** (#39): `g` MUST cycle grouping: status, phase, track, priority.
- **FR-011** (#40): A "Touched this session" section MUST list specs Claude read or edited this session, from tool events held in the mod state.
- **FR-012**: The summary row MUST show the spec count followed by a stacked bar (done, ready to close, implementing, early) and counts like `▶6 · 3 early · 6 to close · ✓49`.
- **FR-013**: For a project on main with no `feature.json`, the pane title MUST read the highest open spec with the detail `active: highest open spec (no feature.json, branch main)`.
- **FR-014**: The draw path MUST perform no reads (Principle XII); disk is the truth and events are hints (Principle V).

### Key Entities

- **Spec row**: One spec folder with id, name, phase, progress and checks.
- **Block**: A group of up to 50 specs by id.
- **Check**: One data-drift finding tied to a spec or to the project.
- **View**: Focus or All.
- **Placeholder run**: A consecutive range of ids not read yet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Focus draws the same number of rows at 64, 200 and 1000 fixture specs.
- **SC-002**: A 140-spec fixture draws, folds, scrolls and jumps correctly at 80 pane columns.
- **SC-003**: Every drift type in the fixtures (done with open tasks, duplicate ids, dangling `feature.json`, missing plan files) is reported in the checks row and under its spec.
- **SC-004**: A search for `0%` on a spec with no task data finds none.
- **SC-005**: The draw path performs no file reads in the tests.
- **SC-006**: The README section on the Specs tab is updated.

## Assumptions

- Spec 066 provides the five-tab pane and the spec block this builds on.
- Fixtures live in `tests/fixtures/` with 140 specs, duplicate ids, a done spec with open tasks, a dangling `feature.json` and deferred reads.
- Counts on board 6 are from commit 9f14e2d and serve as a reference, not a fixed expectation.
- Spec 040's deferred reading (twenty newest first) already exists.
