# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project releases from
tags `vX.Y.Z` equal to `plugin.json`'s `version`.

## [Unreleased]

## [0.136.0] - 2026-10-13

Specs 070 to 075: the footer is statusline's own output, and a second pass over the design boards.

### Added

- Spec 070: the pane footer is statusline's renderer, vendored and refreshed while the pane is drawn, with a native fallback.
- Specs 071 to 074: context and trend in the Session tab with a governor box, clearer governor questions, a Ready to close group and a why-active line, Setup groups for the governor options.
- Spec 075: a second pass over the nine boards of the design canvas. The band's bar is one heavy
  line, the percentage shows from 200 columns, a `PR #41 ✓` chip sits at the right edge from 200
  columns, and the update button reads `⬆ gstack 1.91.33`, `⬆ gstack`, `⬆1` by width. Specs rows
  use a nine-cell `▰▱` bar, `Name N` headings, `◆ ✓ ✖ ·` marks and a track tag; the selected spec
  is a block with its needs, its summary line and its buttons. The Tasks tab marks the current
  task as a block, draws `○` and `test` tags and no group headers. Session gets a chips row and one
  constitution row; Setup shows `‹ value ›`, `(nerd here)` and finds an option with `/`; a check
  row offers `⧉ ask Claude to reconcile`.

### Removed

- The breadcrumb and the summary block above the Specs list, and the summary's expand toggle.

## [0.135.0] - 2026-10-12

The design review (umbrella spec 063) lands as specs 064 to 069.

### Added

- Spec 064: one visual vocabulary on every surface. A usage ramp for context, 5h, 7d and the spend
  limit (`7d 81%▴ hold`), a `faint` role for muted text, narrow state glyphs (`‖ ◷ ▲`), task and
  feature ids that are never cut, one duration format, one phase abbreviation table, one verb per
  key, one message prefix (`astrolabe ✓`, `astrolabe ▲`) and one zone separator rule. Snapshot
  tests cover band, status, footer and pane in five flavors at four widths.
- Spec 065: a one-row band with one update button and a hide button at its right edge, a status
  entry that keeps the lead (feature, phase, percentage and the deciding window), and the prompt
  hint only while drafting.
- Spec 066: the pane has five tabs (Specs, Tasks, Session, PRs, Setup), usage bars with governor
  ticks, a legend row and a help overlay on `?`. The Dashboard folds into Session and Config and
  Models into Setup; a saved tab maps across.
- Spec 067: Focus and All views of the Specs tab with blocks of 50, a checks row, a `#` jump, a
  scroll thumb, groupings and a Touched this session section, so a project of 1,000 specs keeps
  one height.
- Spec 068: the three-line footer carries what a statusline shows: conflicts, upstream-aware ahead
  and behind, detached HEAD, worktree origin, start directory, repository, PR draft state and
  labels, last CI run, skills, todo progress, `fast`, the prompt cache and a burn projection that
  shows only when it lands before the reset. Branch, PR, skills and model chips brighten for 30
  seconds after a change, and a hover row explains each chip.
- Spec 069: one live table above the prompt for subagents, git gates (from the process list, read
  on the clock around commands that may run a hook), the prompt cache and usage limits, with
  stable columns and a fixed drop order. New option `liveRows`.

### Fixed

- Snapshots no longer depend on the machine's time zone.
- The update button draws in a project without Spec Kit; a stale queue button warns instead of
  claiming success; the PRs and Setup tabs no longer draw the Specs rows above their body.
- In the All view a touched spec is drawn once; a filter lists the rows it asked for.

## [0.134.0] - 2026-10-12

The release line continues above the tag v0.133.0 already on the remote, so this release is
0.134.0 and carries everything of 0.122.0 to 0.124.0 below.

### Added

- Spec 043 T009 (#29): `b` pages the pane back by a window, as `k` does. `b` left the queue's
  run keys.
- Spec 043 T010 (#30): each tab keeps its scroll offset per project in the store, across a reload
  and a new session.
- Spec 054 T027 (#27): the Tasks tab groups open tasks as current, next, blocked by an earlier
  task and later.
- Spec 054 T048 (#48): the footer chips read their order and colour from one table, which the Help
  tab prints.
- The footer of the mod carries the advisor (`adv N`, the runs this session) and Astrolabe's own
  version (`astrolabe 0.134.0`, the first chip a narrow footer drops), so a separate statusline is
  not needed for them.

### Fixed

- The README images job on `main` renders mermaid with Chromium's sandbox off (PR #151).

## [0.123.0] - 2026-10-12

### Fixed

- Progress was stale during a turn: the mid-turn sync never re-read the active feature's
  `spec.md`, `plan.md` and `tasks.md`, so a task ticked by a shell command, a subagent or an MCP
  tool showed only at the turn's end. A stat-only probe (three stats, no read) now runs every two
  seconds while a turn runs and after Bash and `mcp__` tools, and reads the feature only when a
  file's modification time moved.

## [0.122.0] - 2026-10-12

### Added

- Spec 050 T001 (#97): when `~/.claude/settings.json` sets a `statusLine` command that runs
  jonyfs/statusline, one toast asks who owns the footer. `/astrolabe footer <astrolabe|statusline>`
  stores the pick in `$.store`; with `statusline` Astrolabe stops drawing its status entry.

## [0.121.0] - 2026-10-12

### Added

- Performance benchmark suite (`npm run benchmark`) with baseline comparison, a regression
  threshold and a PR comment with the per-metric table, run by CI on every pull request.
- README image generation (`npm run generate-images`) rendering the `docs/diagrams/`
  sources to `docs/images/` (PNG, SVG, WebP) with a manifest so only changed images rebuild;
  CI commits the results with `[skip ci]`.
- Desktop app captures (`npm run capture`): Playwright-driven screenshots and videos of the
  views declared in `config/capture-views.json`, uploaded weekly by the capture workflow.
- Generated privacy policy (`npm run generate-privacy`): `docs/privacy.md` is produced from
  `config/privacy.config.json` and validated against the declared jurisdictions.
- Marketplace plugin assets (`npm run build-assets`): the sources in `docs/assets/source/`
  are resized to every marketplace specification under `docs/assets/marketplace/`, with
  validation.
- Load test (`npm run load-test`): hundreds of synthetic Spec Kit features with a tunable
  simple/medium/complex distribution, per-feature timeout and memory limit, run weekly with
  the report kept for 90 days.
