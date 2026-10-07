# Implementation Plan: Astrolabe replaces the statusline

**Branch**: `018-statusline-dashboard` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Three pure modules hold the new behaviour, and `register.tsx` wires them. `hooks/core/footer.ts`
builds the status entry from ranked parts and fits it to a width. `hooks/core/icons.ts` holds the
three icon sets. `hooks/core/dashboard.ts` turns the session's numbers into KPI rows and chart
grids (dial, phase bars, usage line), each a grid of cells that the terminal draws as a `Raster`,
the remote surfaces as an `Svg`, and anything else as text. A new `$.state` key `session` keeps the
counters, the last model and effort, context, cost, git state and the usage series. The git counts
come from one `git status --porcelain=v2 --branch` per main turn, parsed by
`hooks/core/git-status.ts`.

## Technical Context

**Language/Version**: TypeScript (TSX) hooks module for Claude Code 2.1.292
**Primary Dependencies**: none; the engine's element tables (`Box`, `Text`, `Button`, `Raster`, `Svg`)
**Storage**: `$.state` `astrolabe.session` (session); nothing new in `$.store`
**Testing**: `claude plugin test .` (`claude-code/testing`), unit tests for every pure module
**Target Platform**: Claude Code terminal (macOS, Linux, Windows), Desktop Code tab, VS Code
**Performance Goals**: drawing reads only `$.state`; one git process per main turn at most, killed after 2 s
**Constraints**: the state the feature adds stays under 4 KB; charts fit 40 to 200 columns
**Scale/Scope**: one footer line, one new pane tab, three charts

## Constitution Check

| Principle | Compliance | Status |
|---|---|---|
| III | New `$.state` key `session`, declared in the contract; no settings written. The statusline is removed by the owner, not by the mod. | Pass |
| IV | Footer, icons, git parsing, KPIs and charts are pure; `$` only in `register.tsx`. | Pass |
| VI | Tests first for each module, then integration tests for the footer, the git query and the Dashboard. | Pass |
| VII | The status entry stays one line; no toast; the Dashboard opens only when asked. | Pass |
| VIII | The footer fits the last known width; every chart sizes from `bodyColumns` and falls back to numbers below its minimum. | Pass |
| IX | Chart colors come from theme tokens; no literal color in an adapter. | Pass |
| XI | Missing data drops its part; surfaces without `Raster` or `Svg` get text. | Pass |
| XII | The git process runs at `turn.complete`, never while drawing; no network. | Pass |
| XIV | Version 0.12.0. | Pass |

## Project Structure

### Documentation (this feature)

```text
specs/018-statusline-dashboard/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
hooks/core/footer.ts        status entry parts, ranks, width fitting
hooks/core/icons.ts         nerd, emoji and ascii sets; auto by surface
hooks/core/git-status.ts    porcelain v2 parser
hooks/core/dashboard.ts     KPI rows, dial, phase bars, usage line chart (cell grids)
hooks/core/cells.ts         cell grid type, Raster encoding, Svg rendering, text fallback
hooks/surfaces/dashboard.tsx   the Dashboard tab tree
hooks/register.tsx          turn.step observer, counters, git query, status, pane tab 4
types/index.d.ts            SessionStats, GitState
tests/core/{footer,icons,git-status,dashboard,cells}.test.ts
tests/integration/{footer,dashboard}.test.tsx
```

**Structure Decision**: the existing single-project layout; one module per concern, as 001 to 017 did.

## Complexity Tracking

| Item | Why it is needed | Simpler option rejected because |
|---|---|---|
| Three chart renderers (Raster, Svg, text) | The owner asked for charts; the terminal and the app draw different elements | Text only looks worse in the terminal, and the app has no `Raster` |
| One git process per turn | Ahead, behind and changed files are not in any file Astrolabe reads | Reading the index by hand is slower and wrong for worktrees and submodules |
