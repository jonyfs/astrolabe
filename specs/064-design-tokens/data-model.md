# Data Model: Design Tokens

All types are pure values in `hooks/core`. None is persisted.

## ThemeRole (extended)

`accent | text | muted | faint | done | current | warn | pending | barFill | barEmpty | blocked`

- `faint`: muted text. Must reach 4.5:1 on its flavor's base.
- `warn`: the yellow level of the usage ramp. Must reach 4.5:1 on its flavor's base.
- `pending`: rules, separators and glyphs only. Exempt from the text contrast loop.
- `THEME_TOKENS.faint` is `subtle`, `THEME_TOKENS.warn` is `warning`.

## UsageRamp

| Field | Type | Meaning |
|---|---|---|
| `level` | `'ok' \| 'warn' \| 'block'` | below `warnAt`; from `warnAt`; from `blockAt` |
| `role` | `ThemeRole` | `done`, `warn`, `blocked` |
| `chip` | `ChipColour` | `green`, `yellow`, `red` |
| `mark` | `'' \| '▵' \| '▴'` | none, from 60, from the block level |
| `full` | `boolean` | percent is 100 or more |

Inputs: `percent: number | undefined`, `thresholds?: { hold?: number; stop?: number }`.

Rules: `blockAt = thresholds.hold ?? 80`; `warnAt = min(60, blockAt)`. An undefined or non-finite percent gives `{ level: 'ok', mark: '', full: false }` and the caller prints `?`.

## Duration text

`duration(ms) -> string`:

| Input | Output |
|---|---|
| not finite or negative | `?` |
| under 60 000 ms | `40s` |
| under 3 600 000 ms | `4m12s` |
| otherwise | `2h09m` |

`resetIn(iso, now) -> string`: under a day `duration(left)`, beyond a day `Thu 18:00`, missing or past `?`.

## Phase abbreviation

`PHASE_SHORT: { specify: 'spec', clarify: 'clar', plan: 'plan', tasks: 'tasks', implement: 'impl' }`. `done` has no short form and prints as is.

## Key verb

`{ key: string; verb: string; alias?: string }`. Table order is the legend order.

## Message

`message(kind: 'ok' | 'warn', text: string) -> string` returns `astrolabe ✓ <text>` or `astrolabe ▲ <text>`.

## Zones

`joinZones(zones: string[][]) -> string`: items of a zone joined with ` · `, zones joined with ` │ `. A zone item containing `│` is a programming error caught by the unit test, not at runtime.

## Ids

`idWidth(ids: string[], min = 3) -> number` is the widest id, at least `min`. `padId(id, width) -> string` pads on the right with spaces so names start in one column, and never cuts. Ids are not zero-padded: `064` stays the folder's own prefix. Task ids are returned unchanged.

## Glyphs

`STATE_GLYPHS = { paused: '‖', elapsed: '◷', warning: '▲' }` and `EMOJI_WIDE: string[]` listing the emoji-set entries allowed to be two cells.
