---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Statusline as the Footer

**Feature Branch**: `070-statusline-dependency`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Make the footer of Astrolabe the jonyfs/statusline project itself, imported and kept up to date automatically when Astrolabe is installed or used, so statusline is a dependency of Astrolabe. Replace the footer that imitates statusline with statusline running inside the footer region of Astrolabe, or usable as Claude Code's own statusLine as it is today."

**Depends on**: [068-footer-statusline-parity](../068-footer-statusline-parity/spec.md) (the footer region, its three lines and fallbacks), [069-live-table](../069-live-table/spec.md). **Source**: [jonyfs/statusline](https://github.com/jonyfs/statusline) (`bin/cli.js`, `src/render.js`).

## Why

Since spec 041 and 068 Astrolabe draws its own copy of statusline's bar: chips, ranks, colours and shed order are reimplemented in `hooks/core/footer*.ts`. Every statusline release (rows, themes, gate runs, rtk, Copilot and Codex harnesses, spec 046 to 050 of that project) has to be ported by hand and drifts. The owner of both projects wants one footer: statusline renders it, Astrolabe hosts it.

## Placement

The footer region keeps its three places (`footerIn`): the bottom of the pane, under the prompt as the status entry, or both. A new option `footerSource` picks who draws the text of that region:

- `statusline` (default when the dependency is present): the statusline project renders the footer. Astrolabe calls its renderer with a payload built from what the mod knows and draws the returned lines in the footer region.
- `native`: Astrolabe's own chips, as today (specs 041, 064, 068). This is also the fallback while the dependency is missing, stale beyond use or failing.

Claude Code's own `statusLine` setting is not touched (Principle III). A person who installed statusline as Claude Code's `statusLine` keeps it; Astrolabe then does not draw a second copy in the status entry (`footerOwner`, spec 050).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The footer is statusline's own bar (Priority: P1)

A user installs Astrolabe. The footer under the pane's tabs shows statusline's three lines, the same bar their statusline project draws elsewhere, with its segments, ranks, colours and shedding, without installing or configuring statusline separately.

**Why this priority**: It is the request: one footer, no port to maintain.

**Independent Test**: Install Astrolabe on a machine without statusline; open the pane; compare the footer with `statusline-plugin` output for the same payload.

**Acceptance Scenarios**:

1. **Given** a fresh install and network access, **When** the first session starts, **Then** the statusline dependency is fetched into Astrolabe's own data folder without a prompt and the pane footer shows its output within one refresh.
2. **Given** the dependency is present, **When** the pane draws, **Then** the footer lines are statusline's lines for the payload Astrolabe built, cut to the pane's columns, with statusline's own colours.
3. **Given** `footerSource` is `native`, **When** the pane draws, **Then** the footer is Astrolabe's own chips and no statusline process runs.
4. **Given** statusline is also set as Claude Code's `statusLine`, **When** the status entry would draw the footer, **Then** Astrolabe draws only its lead, never a second copy.

---

### User Story 2 - It stays current without asking (Priority: P1)

A user keeps using Astrolabe. When statusline publishes a new release, Astrolabe picks it up on its own, at most once a day, and the footer changes with it. A failed update leaves the working copy.

**Why this priority**: "Imported and updated automatically" is half the request.

**Independent Test**: Publish a newer tag in a fixture remote; start a session after the interval; check the footer reports the new version.

**Acceptance Scenarios**:

1. **Given** a newer release tag exists, **When** a session starts after the daily check, **Then** the copy is replaced with that tag and one toast says `astrolabe ✓ statusline 1.47.0 installed`.
2. **Given** the network is down or git is missing, **When** the check runs, **Then** the current copy stays, nothing is toasted, and the Setup tab says when the check last ran.
3. **Given** an update fails halfway, **When** the next draw happens, **Then** the previous complete copy is still the one used.
4. **Given** the option `checkUpdates` is off, **When** a session starts, **Then** no network call is made for statusline; a copy already present is used as is.

---

### User Story 3 - It can always fall back (Priority: P1)

A user without Node, without git, offline or behind a failing renderer still sees a complete footer.

**Why this priority**: The footer is on every tab; a blank or broken one is worse than today's.

**Independent Test**: Run with node missing, then with a renderer that exits 1, then with one that hangs.

**Acceptance Scenarios**:

1. **Given** node is not on the PATH, **When** the pane draws, **Then** the native footer shows and the Setup tab says why.
2. **Given** the renderer exits non-zero or prints nothing, **When** the pane draws, **Then** the last good output is reused for up to a minute, then the native footer.
3. **Given** the renderer takes longer than its budget, **When** it is killed, **Then** the draw is not delayed (it never ran on the draw path) and the next refresh retries.
4. **Given** the renderer's output holds control sequences other than colours, **When** drawn, **Then** they are dropped.

---

### User Story 4 - Choose and see the source (Priority: P2)

A user can switch between the dependency and Astrolabe's own footer, see which version of statusline is in use, and update it on demand.

**Why this priority**: A dependency that cannot be inspected or turned off is hard to trust.

**Independent Test**: Open the Setup tab; change `footerSource`; run `/astrolabe statusline update`.

**Acceptance Scenarios**:

1. **Given** the dependency is present, **When** the Setup tab opens, **Then** it shows its version, commit, when it was checked and the source in use.
2. **Given** `/astrolabe statusline update`, **When** the person runs it, **Then** the check runs now and the result is reported once.
3. **Given** `/astrolabe doctor`, **When** it runs, **Then** it includes a statusline row: present, version, last check, last render time and any error.

---

### Edge Cases

- The statusline project changes its output format or exits with an incompatible version: the renderer's version is checked against a range Astrolabe declares; outside it, the native footer shows and the Setup tab says so.
- The payload lacks fields (the engine gives a mod less than Claude Code's `statusLine` stdin): statusline degrades field by field (its own "missing payload" behaviour); Astrolabe never invents a value.
- Two sessions update at the same time: the copy is replaced atomically; a session never reads a half-written folder.
- The folder was edited by hand: an update that cannot fast-forward replaces the folder from the tag; local edits are not kept (the copy is a cache).
- Windows: the renderer is started with `node` and an argv array, never through a shell.
- A very narrow pane: statusline's own shedding applies; Astrolabe passes the pane's columns and rows.
- Desktop surface: ANSI colours are mapped to elements; no raw escape sequence reaches the screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Astrolabe MUST keep a copy of the statusline project in a folder it owns under the plugin's data directory, never in `~/.claude/settings.json`, the project, or another plugin's folder.
- **FR-002**: The copy MUST be fetched on first use and checked for a newer release at most once a day, on the mod clock, and MUST be replaced atomically; a failed fetch MUST leave the previous copy in use.
- **FR-003**: Updates MUST follow release tags of the statusline repository, not its default branch, and MUST accept only a version inside the range Astrolabe declares as compatible.
- **FR-004**: A new option `footerSource` (`statusline` or `native`, default `statusline`) MUST choose who draws the footer; `footerIn` keeps choosing where.
- **FR-005**: With `footerSource=statusline`, Astrolabe MUST build a payload from `$.state` (model, effort, workspace, context, rate limits, cost, session facts it already keeps) and run the renderer on the mod clock, storing its lines in `$.state`; the draw path MUST only read that state.
- **FR-006**: The renderer MUST run as `node <copy>/bin/cli.js` with an argv array, the payload on stdin, the terminal columns and rows in its environment, a time budget, and no shell.
- **FR-007**: Returned lines MUST be parsed into styled runs; only colour and attribute sequences are kept; every other control sequence MUST be dropped; the pane draws the runs with the colours statusline chose (Principle IX is met by the dependency owning them, and no literal colour is added to an adapter).
- **FR-008**: When the dependency is missing, outside the compatible range, failing, or `footerSource=native`, the footer MUST be Astrolabe's own (Principle XI), with the reason shown in the Setup tab and in `/astrolabe doctor`.
- **FR-009**: When statusline is Claude Code's `statusLine`, the status entry MUST NOT repeat the footer (spec 050 `footerOwner` rule).
- **FR-010**: `checkUpdates=off` MUST disable the network use for this dependency; an existing copy MUST still be used.
- **FR-011**: A refresh MUST run at most once per turn end and once per usage reading, at most every 5 seconds, and MUST NOT run while the pane is closed and `footerIn=pane`.
- **FR-012**: The README MUST document the option, the data folder, the update rule, the fallback and how to use statusline as Claude Code's own `statusLine` instead, with working examples and a capture (Principle II).
- **FR-013**: Principle III and XIV MUST be amended in the constitution in the same change to name the data folder and the pinned-range rule, with their rationale.
- **FR-014**: Out of scope: installing statusline's `statusLine` setting for the user, its hooks, its Copilot, Codex and OpenCode harnesses, and its own `install` and `update` commands.

### Key Entities

- **Dependency copy**: The folder with a statusline release: its tag, commit, fetched-at time and check time.
- **Footer payload**: The JSON object Astrolabe builds from state and sends to the renderer.
- **Rendered footer**: The lines and styled runs the renderer returned, with the time and the version that produced them.
- **Compatible range**: The versions of statusline Astrolabe declares it can host.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a machine with only Astrolabe installed, the first pane open after one session start shows statusline's footer without any manual step.
- **SC-002**: The footer's text for a fixture payload equals the renderer's own output for it, line for line (snapshot test).
- **SC-003**: With node removed, a renderer that exits 1, one that hangs and one that prints control sequences, the pane still draws a complete footer and no draw waits on a process (tests).
- **SC-004**: An update that fails at any step leaves the previous copy in use (fault-injection test).
- **SC-005**: `footerSource=native` runs no statusline process and matches the 068 snapshots.
- **SC-006**: A test shows the draw path performs no process, file or network call.
- **SC-007**: README section and capture exist; the constitution carries the amendments.

## Assumptions

- Node 18 or newer and git are the only requirements of statusline (its README); Astrolabe needs them only for this feature and falls back without them.
- The mod can run `node` and `git` through `$.process.run` with stdin and a timeout, and can read and write its plugin data directory.
- statusline reads its payload from stdin and its width from `COLUMNS`; it exits 0 with a one-line fallback on failure (its CLI contract).
- A payload built by a mod carries less than Claude Code's own `statusLine` payload; statusline's missing-field behaviour is acceptable and is shown in the capture.
- Following release tags (not `main`) is the safe reading of "updated automatically": a person gets what its author published as a release. If the owner wants `main`, only FR-003 changes.
- `footerSource=statusline` is the default because the request is for statusline to be the footer; `native` stays as the documented fallback and an opt-out.
