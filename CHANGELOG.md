# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project releases from
tags `vX.Y.Z` equal to `plugin.json`'s `version`.

## [Unreleased]

## [0.124.0] - 2026-10-12

### Added

- Spec 043 T009 (#29): `b` pages the pane back by a window, as `k` does. `b` left the queue's
  run keys.
- Spec 043 T010 (#30): each tab keeps its scroll offset per project in the store, across a reload
  and a new session.

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
