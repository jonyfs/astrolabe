# Implementation Plan: Live Table

**Branch**: `069-live-table` (stacked on `068-footer-statusline-parity`) | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

## Summary

Draw one table above the prompt for what is live: subagents, git gates, the prompt cache and usage limits. Eight shared columns keep their widths for the session. Gate rows come from the process list and a lock file read on the mod clock every 15 seconds. A new option `liveRows` picks agents, gates, both or off.

## Technical Context

Same toolchain as 064 to 068. No new dependency. The core is pure: row builders, the layout with column reservation and the drop order, and the process-list parser. The adapter reads `$.state` only; agent starts and ends and the gate scan write `$.state` from hooks and from `$.clock`.

## Constitution Check

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | Keys in four languages. |
| II Documentation With Examples | Pass | README "What the live table shows". |
| III Native Mod, Zero Settings | Pass | Reads processes and a lock file; writes nothing outside the mod state. |
| IV Pure Core, Thin Surfaces | Pass | `live-table.ts` has no `$`. |
| V Disk Is the Truth | Pass | Gates come from the process list. |
| VI Test-First | Pass | Core tests precede the module. |
| VII Good Neighbor | Pass | Draws nothing when nothing is live; one toast per failed gate. |
| VIII Responsive by Width | Pass | Column drop order is a table. |
| IX Theme by Tokens | Pass | Roles only. |
| X Presets Are Data | Pass | Widths, drop order and gate patterns are data. |
| XI Honest Degradation | Pass | No step, gauge or tokens: blank. |
| XII Nothing Slow on the Draw Path | Pass | The scan runs on the clock; render reads state. |
| XIII Spec Kit for Every Change | Pass | This spec, umbrella 063. |
| XIV Verified Distribution | Pass | `liveRows` is in `plugin.json` `userConfig` and README. |

## Structure

```text
hooks/core/live-table.ts     # NEW: rows, layout, reservation, drop order, process parser
hooks/surfaces/live-table.tsx# NEW: draws the layout
hooks/register.tsx           # agent records, gate scan on the clock, AbovePrompt
types/index.d.ts             # SessionStats.liveAgents, liveGates
plugin.json userConfig       # liveRows
tests/core/live-table.test.ts, tests/integration/live-table.test.tsx
```

Decisions are in [research.md](research.md).
