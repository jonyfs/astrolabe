---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Statusline as the Footer

**Feature Branch**: `070-statusline-dependency`

**Created**: 2026-10-13

**Status**: Draft (revised after the CEO, eng and design reviews of 2026-10-13)

**Input**: User description: "Make the footer of Astrolabe the jonyfs/statusline project itself, imported and kept up to date automatically when Astrolabe is installed or used, so statusline is a dependency of Astrolabe. Replace the footer that imitates statusline with statusline running inside the footer region of Astrolabe, or usable as Claude Code's own statusLine as it is today."

**Depends on**: [068-footer-statusline-parity](../068-footer-statusline-parity/spec.md) (footer region and its native chips, kept as fallback). **Source**: [jonyfs/statusline](https://github.com/jonyfs/statusline) (`bin/cli.js`).

## Why

Since specs 041 and 068 Astrolabe draws its own copy of statusline's bar: chips, ranks, colours and shed order are reimplemented in `hooks/core/footer*.ts`. Every statusline release has to be ported by hand and drifts. This spec adds the path where statusline itself draws the pane footer. It adds that path and does not yet delete the port; a later spec reduces the native chips once this one has run for a release (see Out of scope).

## What the reviews changed

The first draft fetched release tags at runtime into a data folder. Review found that this cannot work today: the repository's last tag is `v1.3.0` while `package.json` says `1.47.0`; the engine has no `mkdir`, `rename` or `remove` for the mod and no verified plugin data directory; and a runtime clone of mutable code on every user's machine weakens Principle XIV. The design is now a **vendored copy** kept current by CI:

- Astrolabe ships `vendor/statusline/` (`bin/`, `src/`, `package.json`, `LICENSE`) and a `VERSION` file with the upstream commit.
- A scheduled workflow opens a pull request that refreshes the copy, runs the contract test against it, and lets the existing release and auto-reload flow deliver it. "Installed or used" is met: installing Astrolabe installs it, and using Astrolabe (its own auto-update and reload) updates it, with no runtime network and no first-run gap.

## Placement and ownership

The footer region keeps its places (`footerIn`). A new option `footerSource` picks who draws it:

- `statusline` (default): Astrolabe keeps its **native lead** (Spec Kit part, the deciding usage window, advisor, help) on the first row and statusline draws the rows below it. Chips both would draw (context, windows, model, burn) come from statusline; the native lead never repeats them.
- `native`: Astrolabe's own chips, as in 041 to 069. Also the fallback.

Only the **pane footer** is drawn by statusline. The status entry under the prompt stays native (one plain line, today's rules): it takes plain text and three joined lines would be a regression.

Claude Code's own `statusLine` setting is never touched (Principle III). A person who wants statusline as Claude Code's `statusLine` runs `/astrolabe statusline`, which prints the exact command for the vendored copy to paste; or keeps their own install. When `footerOwner` says statusline is Claude Code's `statusLine`, the pane footer still draws (it is a different place) and the status entry draws only its lead.

## What changes for the person (accepted loss list)

With `footerSource=statusline`: no hover explanation rows, no brighten-on-change, no `full` text on hover, no per-chip action targets, and colour thresholds are statusline's (60 and 85) instead of the governor's (60, 80, 88). Kept: statusline's own links (branch, PR, repo, CI as OSC 8), its segments, ranks and shedding. `footerSource=native` keeps every Astrolabe behaviour. The README states this table.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The pane footer is statusline's own bar (Priority: P1)

A user installs Astrolabe. The pane footer shows Astrolabe's lead and statusline's lines under it, with statusline's segments and colours, without installing anything else.

**Why this priority**: It is the request: one footer, no port to maintain.

**Independent Test**: Run the contract fixture; compare the pane's footer lines with the renderer's own output for the same payload.

**Acceptance Scenarios**:

1. **Given** Node 18 or newer on the PATH, **When** the pane opens, **Then** the footer shows the native lead row and statusline's lines for a payload built from the session, cut to the pane's width.
2. **Given** `footerSource=native`, **When** the pane draws, **Then** the footer is the native chips and no statusline process runs.
3. **Given** the footer text holds an OSC 8 link, **When** drawn on the terminal surface, **Then** it is a link; on a surface without links it is plain text.
4. **Given** a resize, **When** the pane redraws, **Then** lines cut to the new width show at once and a refresh for that width runs within a second.

---

### User Story 2 - It can always fall back (Priority: P1)

A user without Node, with a broken copy, or with a renderer that fails still sees a complete footer.

**Why this priority**: The footer is on every tab; a blank or "unavailable" one is worse than today's.

**Independent Test**: Fault-injection: no node; a renderer that exits 1; one that hangs; one that prints its own fallback line with exit 0; one that prints control sequences.

**Acceptance Scenarios**:

1. **Given** `node --version` fails or is older than 18, **When** the pane draws, **Then** the native footer shows and the Setup tab states the reason.
2. **Given** the renderer prints `statusline unavailable` or `statusline needs Node` with exit 0, **When** read, **Then** it counts as a failure, the last good lines are used for up to 60 seconds, then the native footer.
3. **Given** the renderer exceeds its budget, **When** it is killed, **Then** nothing on the draw path waited and the next refresh retries with backoff of 5, 15 and 60 seconds.
4. **Given** the output holds control sequences other than colour, attributes and links, **When** parsed, **Then** they are dropped.
5. **Given** the source in use is not the one chosen, **When** the pane draws, **Then** one dim row under the footer says why, and nothing is toasted.

---

### User Story 3 - It stays current without asking (Priority: P2)

When statusline changes, Astrolabe's repository receives a pull request that refreshes the vendored copy, with its contract test run against it; once merged and released, installed copies update through Astrolabe's own flow.

**Why this priority**: "Updated automatically" is half the request.

**Independent Test**: Run the sync script against a fixture upstream; check the copy, `VERSION` and the contract test.

**Acceptance Scenarios**:

1. **Given** upstream has new commits, **When** the sync workflow runs, **Then** a pull request changes `vendor/statusline/` and `VERSION` and its checks run the contract test.
2. **Given** the new copy fails the contract test, **When** the workflow runs, **Then** no pull request is opened and the run fails.
3. **Given** the vendored copy changed in a release, **When** Astrolabe reloads, **Then** the Setup tab shows the new version and commit.

---

### User Story 4 - Choose, see and reuse (Priority: P3)

A user can switch the source, see which statusline is in use, and get the command to use the same copy as Claude Code's `statusLine`.

**Acceptance Scenarios**:

1. **Given** the Setup tab, **When** it opens, **Then** it shows `Footer source`, the vendored version and commit, and the fallback reason when there is one.
2. **Given** `/astrolabe statusline`, **When** it runs, **Then** it prints the vendored command and the line to put in `settings.json`, and writes nothing.

---

### Edge Cases

- The payload lacks fields (the engine gives a mod less than Claude Code's own payload): Astrolabe sends only fields it has; statusline degrades per field and fills what it can from git, gh and the transcript on its own; the README lists those probes.
- `transcript_path` is not exposed to the mod: skills, todo and working chips that read the transcript are absent; stated in the README.
- Windows: the renderer starts with `node` and an argv array, never through a shell; a missing `HOME` is not assumed.
- Desktop surface: the renderer is asked for ASCII when `iconsFor` says `ascii` or `emoji`, so no Nerd Font glyph shows as a box.
- Another statusline install shares `~/.claude/statusline/` state: documented; the caches are keyed by session and safe to share.
- The statusline project removes an option Astrolabe sets: unknown environment variables are ignored by it; the contract test names the ones Astrolabe relies on.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST ship the runtime of statusline under `vendor/statusline/` (`bin/`, `src/`, `package.json`, `LICENSE`) and `vendor/statusline/VERSION` naming the upstream commit and package version. No other upstream file is shipped.
- **FR-002**: A workflow MUST refresh the copy on a schedule and on demand through a pull request, MUST run the contract test against it, and MUST NOT open a pull request when the test fails.
- **FR-003**: The contract test MUST run the vendored `bin/cli.js` on fixture payloads with a fixed environment and assert: exit 0; no fallback text; at least one non-blank line; every line within `COLUMNS`; the environment variable names Astrolabe sets are still read.
- **FR-004**: A new option `footerSource` (`statusline` or `native`, default `statusline`) MUST choose who draws the pane footer; `footerIn` keeps choosing where. It MUST appear in `plugin.json` (four-language descriptions), the README, the Config tab "display" group and the Setup rows.
- **FR-005**: With `footerSource=statusline` the pane footer MUST be the native lead row followed by statusline's lines, `LINES` set to the rows the region may take less the lead row; lines past that MUST be dropped.
- **FR-006**: The renderer MUST run on the mod clock with `node <plugin.root>/vendor/statusline/bin/cli.js`, an argv array, the payload on `stdin`, a budget of 3 seconds, and the environment additions `COLUMNS` (region width), `LINES`, `COLORTERM=truecolor`, `CLAUDE_STATUSLINE_UPDATES=off`, `CLAUDE_STATUSLINE_DEBUG=0`, `CLAUDE_STATUSLINE_FLAVOR` mapped from `flavor` (colorblind has no statusline flavor: native footer), and `CLAUDE_STATUSLINE_ASCII=1` when the icon set is ASCII, the mode accessible or the surface is not the terminal.
- **FR-007**: The payload MUST carry only fields the mod has, converted to statusLine's shapes (the table in the data model), among them `rate_limits.*.resets_at` as epoch seconds, `context_window.used_percentage`, `cost`, `session_id`, `workspace.current_dir` and `model.display_name`.
- **FR-008**: Output MUST be parsed into styled runs (SGR colour and attributes, OSC 8 links); every other control sequence MUST be dropped. A result whose plain text holds a known fallback line MUST count as failure.
- **FR-009**: The draw path MUST only read state: the rendered runs live under their own state key, written only when they change; refresh runs on session start, turn end, each usage reading, pane open and every 30 seconds while the footer is visible, at most every 5 seconds, one process at a time; output older than 90 seconds MUST NOT be presented as current.
- **FR-010**: When Node is missing or older than 18, the copy is missing, `footerSource=native`, the flavor is colorblind, or the renderer fails, the footer MUST be the native one with the reason in the Setup tab, with no toast.
- **FR-011**: `/astrolabe statusline` MUST print the command and settings line for the vendored copy and MUST write nothing.
- **FR-012**: The README MUST document the option, the loss list, what the dependency writes (`~/.claude/statusline/`) and runs (`git`, `gh`, `rtk` probes in detached children), the sync workflow and how to use it as Claude Code's `statusLine`, with a capture (Principle II).
- **FR-013**: The constitution MUST be amended (MINOR) in the same change: III (a bundled program may keep its own caches under `~/.claude/statusline/`; the mod itself writes nothing outside `$.store` and `$.state`), IX (colours of a dependency's output are data, not adapter literals) and XIV (a bundled dependency is pinned by commit and refreshed by a reviewed pull request), with a Sync Impact Report.
- **FR-014**: Out of scope: deleting the native chips (a follow-up spec once this has run one release), statusline's `install` and `update` commands, a machine-readable output mode in statusline (a statusline-side change that would replace the ANSI parser), and the status entry.

### Key Entities

- **Vendored copy**: The runtime files and their `VERSION`.
- **Footer payload**: The JSON object built from session state.
- **Rendered footer**: The runs the renderer returned for a width, with the time they were made.
- **Source in use**: `statusline` or `native`, and the reason when it differs from the choice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The contract test passes against the vendored copy in CI on three operating systems.
- **SC-002**: For a fixture payload the pane's statusline rows equal the renderer's lines after width cutting (snapshot test).
- **SC-003**: With node missing, a renderer that exits 1, one that hangs, one that prints its fallback and one that prints control sequences, the pane still draws a complete footer and no draw waits on a process (tests).
- **SC-004**: `footerSource=native` runs no statusline process and matches the 068 snapshots.
- **SC-005**: A test shows the draw path performs no process, file or network call.
- **SC-006**: Identical renderer output does not write state (test).
- **SC-007**: README section and capture exist; the constitution carries the amendments.

## Assumptions

- Node 18 or newer is common on developer machines; without it the native footer shows. This is the only new requirement.
- The vendored copy is shipped in the plugin, so it exists wherever Astrolabe does; the mod only reads and executes it.
- The reviews' open choices were decided as follows and can be flipped without a rewrite: vendoring over runtime fetch; default `statusline` because the request is for statusline to be the footer; native lead kept above statusline's rows; status entry stays native; loss list accepted.
- `transcript_path` may not reach the mod; if a hook event carries it the mod passes it on.
