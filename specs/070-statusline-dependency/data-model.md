# Data Model: Statusline as the Footer

## Persistent (`$.store`)

- `statusline.meta`: `{ version, commit, dir, checkedAt, fetchedAt, lastError? }`. Written only by the update step.

## Session (`$.state`, `SessionStats`)

- `statuslineRender`: `{ at, version, columns, lines: Run[][] }`. The last good output.
- `statuslineHealth`: `{ source: 'statusline' | 'native', reason?: string, renderMs?: number, failedAt?: number }`.

## Core types

- `Run`: `{ text: string; fg?: string; bg?: string; bold?: true }`, `fg` and `bg` as `#rrggbb` taken from the renderer's own escapes.
- `FooterPayload`: the subset of Claude Code's `statusLine` payload Astrolabe can fill (`model`, `workspace`, `context_window`, `rate_limits`, `cost`, `session_id`, `transcript_path`, `version`).
- `CompatibleRange`: `{ min: '1.46.0', maxExclusive: '2.0.0' }`.

## Files in the data folder

- `statusline/current.json`: `{ "dir": "1.46.0" }`.
- `statusline/<version>/`: the clone at that tag.
