# Data Model: Band and Status

## Segment (extended)

| Field | Type | Meaning |
|---|---|---|
| `key` | string | Stable address; `label-<step>`, `mark-<step>`, `chip-step`, `task`, `paused`. |
| `text` | string | Drawn text. |
| `role` | ThemeRole | Colour role; for a chip, the background. |
| `chip` | `true`? | Draw with a background and the stronger-contrast foreground. |
| `href` | string? | A path under the feature folder; the surface makes it a link. |
| `action` | `'lift'`? | The surface draws a button that lifts the hold for one hour. |

## BandExtras (extended)

`density`, `worktree`, plus `reserved: number` (cells of the right-edge buttons), `governor?: { band: 'hold' | 'stop' | 'ceiling'; until?: string }`, `live?: { agents: number; gates: number }`, `deciding?: string`, `taskElapsed?: string`.

## Rail

Full track: `specify clarify plan tasks implement`, plus `constitution` when not ratified. Quick track: `spec tasks impl`. A finished step reads `✓ name`; the current step is the chip.

## Status lead

Input: state, decision, columns. Output: one string. Never dropped: id and deciding window.
