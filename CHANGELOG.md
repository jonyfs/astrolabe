# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project releases from
tags `vX.Y.Z` equal to `plugin.json`'s `version`.

## [Unreleased]

## [0.140.0] - 2026-10-13

### Changed

- The Specs tab starts on **not done**: specs that are done or abandoned are left out and counted in
  one dim row (`✓ 57 done hidden · s shows them`). `s` cycles not done, all, in progress, next up,
  done, abandoned. A text typed in the filter box and a `#` jump still look at every spec.

## [0.139.0] - 2026-10-13

### Added

- Spec 080: in the terminal the Specs list is a surface module (`specs-client.tsx`). After a click on
  the list it takes `→` (open a spec), `←` (fold it, or select the spec of a task), PageUp, PageDown,
  Home, End, Tab and Shift+Tab (the tabs), Enter, and the letters `t`, `e`, `x`, `u`, `p`, `a`, `s`,
  `o`, `c`, `r`. The engine gives a surface module the keys only after a click, so none of this works
  before one; Esc gives the keys back. The selection moves at once, without a round trip to the hooks.
  The desktop, the accessible mode and a list too long for a module keep drawing the rows as before.

### Changed

- The selected row's detail, description and buttons sit under the list when the list is the module.

## [0.138.1] - 2026-10-13

### Fixed

- Hovering moved the screen. Four reveals sat in the flow of the layout, so showing them pushed
  everything below them: the card of a Setup option, the `↗ plan↗ tasks↗` links of a spec row, the
  step cards of the band and the sentence under a footer chip. They are absolute now (a group at
  the right edge of the row, a card over the rows, a card over the band row, a slot of one row that
  is always there), so a hover moves nothing.

### Added

- Setup and PRs have a selection. The arrow keys pick an option or a pull request (`❯`), and Enter
  changes the option's value, or runs the pull request's first action (approve, update branch,
  merge), asking twice as its buttons do.

## [0.138.0] - 2026-10-13

### Added

- Spec 078: Specs and Tasks are one tab. Tasks sit under their spec as a tree: the active spec starts
  open, Enter opens or folds a spec, `e` opens or folds all, `t` shows only the active spec's tasks,
  `u` makes a spec the active one, and `x` puts a task's tick in the prompt box for Claude. The
  pane has four tabs (Specs, Session, PRs, Setup) on `1` to `4`; the Specs badge reads `2·11`.
- Esc takes one layer: the filter, then the help overlay, then the pane.
- Specs: a `PR #41 ✓` chip, `⎇` for the worktree, gate dots, a bar on each section heading,
  open questions as a first story, `‖ after T012` on a task that waits, one `run these` action
  under a `[P]` run, `m` to cycle Mine, Blocked and Ready to close, `+ specify` on roadmap items.
- Session: the project as a header, the next governor level in the box, the live table with the
  same columns as above the prompt, updates and the governor log folded, review findings with an
  ask action, the doctor's failed checks with their fix.
- PRs: a table with the ones that need you first, a spec chip, an open-PR suggestion for a branch
  without one, and `is:` filters.
- Setup: groups that fold, Minimal, Balanced and Full look presets, `↺ default` per option, conflicts
  named on their row, a copy button for the changed options, and a model and effort button pair per
  skill. The `paneDensity` option leaves a blank row between specs.
- The band's current task is a button that opens the pane at that task.
- Spec 077: the bundled statusline is given the transcript path, the session's duration, the lines
  its tools changed and fast mode, so its skills, activity, duration, lines and `fast` chips draw
  inside Astrolabe. A fact the mod does not have is left out, never zeroed.

### Changed

- Digits follow the tab order: `2` is Session, `3` PRs, `4` Setup. A stored Tasks tab opens Specs.
- The worktree glyph is `⎇` everywhere (it was `⑂` in rows and the band).
- The pane no longer edits `tasks.md`. Astrolabe writes nothing to the project, so Enter twice on
  a task no longer ticks it; `x` hands the tick to Claude.

## [0.137.2] - 2026-10-13

### Fixed

- In the Setup tab, the card with an option's default and description opened under the settings
  that follow it and was hidden by them. It is in the flow now, right under the hovered row.

## [0.137.1] - 2026-10-13

### Fixed

- The pane did not open below about 100 columns of terminal: the footer cut a linked statusline
  run down to its padding, and the engine refuses a link with a blank label (`ui.render (Pane)
  refused: Link label is blank`), so it drew an empty box. A cut that leaves only padding stays
  plain text now, and a run with a blank label is never drawn as a link.

## [0.137.0] - 2026-10-13

### Changed

- The bundled statusline is 1.53.1 (commit `2b565f2`), which prints the runs form and the failure
  contract of its spec 056. The pane footer now reads runs objects and error objects (spec 076)
  instead of parsing escape text; the contract test runs the runs checks against this copy.

### Added

- Spec 076: the pane footer reads statusline's runs output and failure contract (statusline spec
  056): a JSON object of styled runs, or an error object with exit code 75. Copies that predate it
  keep working through the ANSI path; a newer contract falls back to the Astrolabe footer and the
  Setup tab names the reason and the form.

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
