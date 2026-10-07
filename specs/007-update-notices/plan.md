# Implementation Plan: Clickable update notices

**Branch**: `007-update-notices` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Pure parsing and comparison in `hooks/core/updates.ts`. `register.tsx` runs the checks from a
`$.clock.after` callback scheduled at `session.start` and at main `turn.complete` (so neither
waits), stores `{ checkedOn, items }` in `$.store` and `$.state` (`astrolabe.updates`), draws a
second band row of Buttons, and runs the action for a pressed Button.

## Constitution Check

| Principle | Compliance | Status |
|---|---|---|
| III | `$.store` gains `updates`; `$.state` gains `astrolabe.updates`; both declared. | Pass |
| IV | Parsing pure; `$.process`, `$.http`, `$.prompt` only in `register.tsx`. | Pass |
| VII | One row in the shared band, `await next(e)` kept; toasts only for results of a click. | Pass |
| XII | One documented network call per day, off with `checkUpdates: false`; nothing on the draw path. | Pass |
| XIV | Version 0.7.0. | Pass |

## Project Structure

```text
hooks/core/updates.ts                 # parsers, compareVersions, localDay, update rows
hooks/register.tsx                    # checks, band row, pane rows, button actions
hooks/surfaces/band.tsx               # + updatesRow
types/index.d.ts                      # + UpdateItem, astrolabe.updates
.claude-plugin/plugin.json            # + userConfig checkUpdates; 0.7.0
tests/core/updates.test.ts  tests/integration/updates.test.tsx
```

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| One network call per day (GitHub releases API) | The only way to learn Astrolabe's latest version; the user asked for it. | Reading the marketplace clone's version needs a process and lags the release. Documented in the README and switchable off (Principle XII). |
