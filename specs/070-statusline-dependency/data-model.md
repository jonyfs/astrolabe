# Data Model: Statusline as the Footer

## State (`$.state`)

A key of its own, `astrolabe.footer`, declared in `types/index.d.ts` (not `SessionStats`, so unrelated flushes do not copy the runs):

- `render`: `{ at: number; columns: number; lines: Run[][] }`, written only when the lines differ.
- `health`: `{ source: 'statusline' | 'native'; reason?: string; failedAt?: number }`, written only when `source` or `reason` changes.

## Core types

- `Run`: `{ text: string; fg?: string; bg?: string; bold?: true; dim?: true; underline?: true; href?: string }`; `fg` and `bg` as `#rrggbb` or `ansi:0..15`.
- `FooterPayload`: the subset of statusLine's payload Astrolabe fills.

## Payload mapping

| Engine value | Payload field | Conversion | When absent |
|---|---|---|---|
| `rateLimits[kind five_hour]` `percentUsed`, `resetsAt` (ISO) | `rate_limits.five_hour.used_percentage`, `.resets_at` | epoch seconds | field omitted |
| `rateLimits[kind seven_day]` | `rate_limits.seven_day.*` | same | omitted |
| `context.percent`, `context.window` | `context_window.used_percentage`, `.context_window_size` | none | omitted |
| model id and display name noted by `turn.step` | `model.id`, `model.display_name` | short name | omitted (never a made-up name) |
| `$.session.id()` | `session_id` | none | omitted |
| session cwd | `workspace.current_dir`, `cwd` | none | omitted |
| a hook event's `transcript_path`, when seen | `transcript_path` | none | omitted; transcript chips absent |
| effort noted by `turn.step` | `effort` | none | omitted |

## Files

- `vendor/statusline/VERSION`: `{ "commit": "...", "version": "1.47.0", "syncedAt": "..." }`.
