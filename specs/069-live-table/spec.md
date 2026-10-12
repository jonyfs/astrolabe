---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Live Table

**Feature Branch**: `069-live-table`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "One table above the prompt for everything that is running or about to bite: subagents, git gates, the prompt cache and usage limits, with columns that stay aligned."

**Depends on**: [064-design-tokens](../064-design-tokens/spec.md), [065-band-and-status](../065-band-and-status/spec.md) and [068-footer-statusline-parity](../068-footer-statusline-parity/spec.md) (cache and limit data). **Umbrella**: [063-design-review](../063-design-review/spec.md), tasks T043 and T044 (improvements #43 and #44).

**Design reference**: Claude Design canvas (https://claude.ai/code/artifact/65ee4724-d195-4e86-83e2-a438c2757e04), board 8 "Live table" (viewer https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL, anchor `#b8`; static copy `docs/design/astrolabe-redesign.html`). Source behaviour: jonyfs/statusline specs 012, 021, 031 and 036 (agent rows, stable columns, git gate rows, gate scripts run without a hook).

## Placement and columns

The table sits above the prompt, under the band and above `next(e)` (Principle VII). Rows exist only while something is live; with nothing live the table draws nothing.

Eight shared columns (width in cells; header row in the `faint` role, uppercase): WHO 8 · WHERE 16 · WHAT 30 (truncates with `…`, never wraps) · NOW 20 · LEVEL 14 · SIZE 6 right-aligned · TIME 9 right-aligned, plus a one-cell kind glyph before WHO: `◇` agent (lavender), `⛭` gate (peach), `◌` cache (teal), `◔` limit (accent).

| Kind | WHO | WHERE | WHAT | NOW | LEVEL | SIZE | TIME |
|---|---|---|---|---|---|---|---|
| agent | tier (opus, sonnet, haiku) | agent type (blank for a local agent or a name two tasks share) | the brief | current step | context gauge, 9 cells plus percent | tokens | age |
| gate | hook (pre-commit, pre-push, …) or `gate` for a script run directly | worktree, `*` for yours | chain of programs (`gates.sh › review-cycle.test.sh`, `npm run lint · npm test`) | `running` or `waiting for gates.lock` in yellow | blank | blank | age |
| cache | `cache` | ttl (5m or 1h) | what the next message will do | warm or cold | time left as a gauge | tokens to rewrite | expires in |
| limit | window (5h, 7d, spend) | blank | the governor rule in words (`new subagents queued (2)`) | cap, hold or pause | usage gauge with the 064 ramp and marks | blank | reset (countdown under a day, weekday beyond) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One aligned table for everything live (Priority: P1)

A user sees agents, gates, cache and limits in one table whose columns stay aligned. A cell a kind has nothing for stays blank, never `0`. Rows group in the order agents, gates, cache, limits, separated by a one-cell rule, at most three per kind then `+N` with the full list in the Session tab. A column keeps the width it first needed for the rest of the session so rows never jump; shedding still beats a reservation. Cache rows appear in the last 2 minutes of a 5-minute cache or once cold; limit rows from 60%.

**Why this priority**: Scattered live facts make the user hunt; a jumping table is unreadable.

**Independent Test**: Run a fixture session with three agents, two gates, a cooling cache and a 70% limit across several ticks.

**Acceptance Scenarios**:

1. **Given** live agents, gates, cache and limits, **When** the table is drawn, **Then** rows group in that order with a one-cell rule between kinds.
2. **Given** more than three rows of a kind, **When** drawn, **Then** three show and `+N` follows, with the full list in Session.
3. **Given** several ticks, **When** a row with longer text arrives and leaves, **Then** column widths do not shrink for the rest of the session unless width forces shedding.
4. **Given** a kind with no value for a column, **When** drawn, **Then** the cell is blank, not `0`.
5. **Given** nothing live, **When** drawn, **Then** the table draws nothing.
6. **Given** a limit at 59%, **When** drawn, **Then** no limit row shows; at 60% it does.

---

### User Story 2 - See git gates and hooks that block you (Priority: P2)

A user sees gate rows for git hooks found in the process list and for gate scripts matching default patterns (file name starting `gate` or `gates` followed by `-`, `_` or `.`, or inside a `gates/` directory) or the project's `.statusline.json` `gates.patterns`. A holder of a live `gates.lock` shows as waiting. A finished hook leaves at once, and a gate script inside a hook is not counted twice. One toast appears when a gate fails.

**Why this priority**: A hook that runs for minutes looks like a hung terminal.

**Independent Test**: Feed fixture process lists: a hook, a direct script, a `gates.lock` holder, a nested script.

**Acceptance Scenarios**:

1. **Given** a `pre-commit` hook in the process list, **When** read, **Then** a gate row shows its hook name and the chain of programs.
2. **Given** a script `gates.sh` run directly, **When** read, **Then** WHO is `gate`.
3. **Given** a live `gates.lock` holder, **When** drawn, **Then** its NOW reads `waiting for gates.lock` in yellow.
4. **Given** a gate script inside a hook, **When** drawn, **Then** it appears once, under the hook.
5. **Given** a hook that has finished, **When** the next tick checks its pid, **Then** its row is gone.
6. **Given** a gate fails, **When** it does, **Then** one toast appears.

---

### User Story 3 - The table shrinks in a known order (Priority: P2)

A user on a narrow terminal sees the table drop columns in a fixed order and rows give way before footer lines. At 100 columns it drops SIZE, then TIME, then NOW, then WHERE; WHO, WHAT and LEVEL never drop. On a short window, gate rows go first, then agent rows (the band keeps the counts), before any footer line.

**Why this priority**: Predictable shedding keeps the chrome from eating the prompt.

**Independent Test**: Draw the same fixture at 180, 144, 100 and 80 columns and at low height.

**Acceptance Scenarios**:

1. **Given** 100 columns, **When** drawn, **Then** SIZE is gone, then TIME, then NOW, then WHERE as width falls; WHO, WHAT and LEVEL remain.
2. **Given** a short window, **When** drawn, **Then** gate rows go first, then agent rows, before any footer line.

---

### User Story 4 - Choose what the table shows (Priority: P3)

A user sets `liveRows` to agents, gates, both or off (default both).

**Why this priority**: Some users want less.

**Independent Test**: Set each value and draw.

**Acceptance Scenarios**:

1. **Given** `liveRows=agents`, **When** drawn, **Then** gate rows do not show.
2. **Given** `liveRows=off`, **When** drawn, **Then** no agent or gate rows show.
3. **Given** the option, **When** the docs are read, **Then** it is documented in README and `plugin.json` `userConfig`.

---

### Edge Cases

- An agent whose engine reports no step, gauge or tokens: those columns are blank (Principle XI).
- Two tasks share an agent name: WHERE is blank for both.
- A very long brief or chain: truncates with `…`, never wraps.
- A gate pid that disappears between reads: the row leaves on the next tick.
- Cache and limit rows when `liveRows` is `off`: still governed by their own rules, since `liveRows` covers agents and gates.
- Process list unreadable: no gate rows, no error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (#43): One grid MUST serve agents, gates, cache and limits with the eight columns and widths above and the kind glyph before WHO.
- **FR-002** (#43): A cell a kind has nothing for MUST stay blank, never `0`.
- **FR-003** (#43): Rows MUST group in the order agents, gates, cache, limits with a one-cell rule between kinds, at most three rows per kind, then `+N` with the full list in the Session tab.
- **FR-004** (#43): A column MUST keep the width it first needed for the rest of the session; shedding MUST still take precedence over a reservation.
- **FR-005** (#43): Cache rows MUST appear in the last 2 minutes of a 5-minute cache or once cold; limit rows MUST appear from 60%.
- **FR-006** (#44): Gate rows MUST come from hooks found in the process list and from gate scripts matching default patterns or the project's `.statusline.json` `gates.patterns`.
- **FR-007** (#44): A live `gates.lock` holder MUST show as waiting. The process list and lock MUST be read on the mod clock at most every 15 seconds, and each row's pid MUST be checked on the next tick so a finished hook leaves at once.
- **FR-008** (#44): A gate script inside a hook MUST NOT be counted twice. One toast MUST appear when a gate fails.
- **FR-009**: At 100 columns the table MUST drop SIZE, then TIME, then NOW, then WHERE; WHO, WHAT and LEVEL MUST NOT drop.
- **FR-010**: On a short window, gate rows MUST go first, then agent rows, before any footer line.
- **FR-011**: Agent data MUST come from agent start and end events in the mod state; step, gauge and tokens MUST show only when the engine reports them, otherwise blank (Principle XI).
- **FR-012**: Render MUST read only the mod state (Principle XII).
- **FR-013**: The option `liveRows` (agents, gates, both, off; default both) MUST exist and be documented in README and `plugin.json` `userConfig`.
- **FR-014**: The table MUST sit above the prompt, under the band and above `next(e)` (Principle VII).
- **FR-015**: WHAT MUST truncate with `…` and never wrap; the limit column colours MUST use the 064 ramp and marks.

### Key Entities

- **Live row**: One entry of kind agent, gate, cache or limit with its cells.
- **Column reservation**: The width a column has needed so far in the session.
- **Gate pattern**: A file-name or directory rule that marks a script as a gate.
- **Gate lock**: The `gates.lock` file whose holder others wait on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Core tests show column widths fixed across ticks.
- **SC-002**: Core tests show the drop order at 180, 144, 100 and 80 columns, grouping and `+N`.
- **SC-003**: Gate detection passes against fixture process lists for a hook, a direct script, `gates.lock` and a nested script.
- **SC-004**: Adapter tests on terminal and desktop pass.
- **SC-005**: A test shows the draw path performs no process or file reads.
- **SC-006**: README section "What the live table shows" exists with captures at 180 and 100 columns.

## Assumptions

- Spec 068 provides cache and limit data; spec 065 provides the band the table sits under.
- Board 8 holds the exact rows used by the tests.
- Gate patterns and `.statusline.json` follow jonyfs/statusline's existing conventions.
- A mod may read the process list and a lock file on the clock; the render path may not.
