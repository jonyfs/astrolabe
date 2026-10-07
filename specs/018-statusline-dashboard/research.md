# Research: Astrolabe replaces the statusline

## Where the footer goes

- **Decision**: the status entry (`$.ui.status`).
- **Rationale**: it is the one site under the prompt a plugin has. It takes one line of text, its
  first 2,000 characters drawn in the terminal; it has no colors and no width of its own.
- **Alternatives**: a second row in the band above the prompt (rejected: the owner asked for a
  footer, and the band is the Spec Kit rail); a custom statusline command (rejected: a plugin cannot
  set `statusLine`, Principle III).

## The width the footer fits

- **Decision**: the last `viewport.columns` any band, hint, spinner or pane drawing saw, kept in a
  module variable; 120 before any drawing.
- **Rationale**: `$.ui.status` has no viewport. A drawing hook reads it often and costs nothing to note.

## Model and effort

- **Decision**: observe `turn.step` with an async generator hook that notes `e.model` and `e.effort`
  for the main thread (`agentId` absent) and forwards the stream untouched (`yield* next(e)`).
- **Rationale**: the only event that carries the model of the request about to be sent.

## Context and cost

- **Decision**: `session.measure`'s `context.percent` (or `tokens / window`) and `cost.usd`.

## Git counts

- **Decision**: `$.process.run(['git', 'status', '--porcelain=v2', '--branch'], { cwd: root, timeoutMs: 2000 })`
  at the end of a main turn, only when `.git` exists; no shell.
- **Rationale**: one call gives the branch, upstream, ahead and behind, and every changed or
  conflicted path. Version 2 is stable across git versions since 2.11.
- **Alternatives**: parsing `.git/index` (rejected: binary, version dependent, no worktree status).

## Icons

- **Decision**: three sets keyed by part (`branch`, `model`, `context`, `window`, `cost`, `clock`,
  `ahead`, `behind`, `changed`). `auto` is `nerd` when the session's surface is the terminal, else
  `emoji`.
- **Rationale**: a Nerd Font cannot be detected; the statusline assumed one in the terminal too.
  The Desktop app and VS Code draw text in their own font, which has no Nerd Font glyphs.
- Nerd Font glyphs are Private Use Area characters, so they go only in text, never in a `Raster`
  cell, which the engine refuses for anything but a printable width-1 character.

## Charts

- **Decision**: one cell grid per chart, drawn three ways: a `Raster` on the terminal (blocks, box
  drawing and braille, colors from the theme), an `Svg` on Desktop, VS Code and mobile, and plain
  text rows when neither is there or `icons` is `ascii`.
- **Line chart**: in the style of asciichart. A y axis of 0 to 100% labelled every 25, the points as
  a line of box drawing characters, the projection to the reset dotted. No library: a mod has no
  Node and no npm, so the drawing is our own pure code.
- **Dial**: a ring of the six Spec Kit steps with the active one marked and a needle from the centre.
- **Bars**: one row per phase, length proportional to the count, the count after the bar.
- Terminal-UI skills found (`terminal-ui-design`, `tui-design`, `ascii-mini-charts`) were not
  installed. Their rules are followed: ASCII fallback, bounded width, numbers next to every chart.

## Session counters

- **Decision**: turns, tool calls, drift alarms and subagents are counted in module variables and
  written to `$.state` at the end of each main turn and at each measure, so a tool call costs no write.
- **Trade-off**: a reload mid-turn loses that turn's counts; the next turn writes again.
