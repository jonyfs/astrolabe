# Implementation Plan: Statusline as the Footer

**Branch**: `070-statusline-dependency` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

## Summary

Keep a copy of the statusline project in Astrolabe's own data folder, update it daily to the newest compatible release tag, run its CLI on the mod clock with a payload built from session state, and draw its lines in the footer region. Astrolabe's own footer stays as the fallback and as the `footerSource=native` choice.

## Technical Context

Same toolchain as 064 to 069. The new core module is pure (payload builder, ANSI parser, version rules, source choice). The effectful part (clone, ls-remote, render) takes a process port and a fs port and is wired in `register.tsx` on `$.clock`. No new dependency.

## Constitution Check

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | Messages in four languages. |
| II Documentation With Examples | Pass | README section and a capture. |
| III Native Mod, Zero Settings | **Amend** | The mod writes under its own data folder; the amendment names that folder and keeps the ban on user files and settings. |
| IV Pure Core, Thin Surfaces | Pass | Payload, parser, rules in `hooks/core/statusline-dep.ts`. |
| V Disk Is the Truth | Pass | The copy and `current.json` are read from disk each refresh. |
| VI Test-First | Pass | Core and fault-injection tests precede wiring. |
| VII Good Neighbor | Pass | One toast per install or update; none on failure. |
| VIII Responsive by Width | Pass | Columns and rows passed down; statusline sheds. |
| IX Theme by Tokens | Pass | Colours come from the dependency's output; adapters add none. |
| X Presets Are Data | Pass | The compatible range and the cadence are data. |
| XI Honest Degradation | Pass | Every failure path ends in the native footer with a stated reason. |
| XII Nothing Slow on the Draw Path | Pass | Render and update run on the clock; draw reads state. |
| XIII Spec Kit for Every Change | Pass | This spec. |
| XIV Verified Distribution | **Amend** | Names the dependency and the compatible-range rule. |

## Structure

```text
hooks/core/statusline-dep.ts   # NEW: payload, ANSI runs, versions, source choice
hooks/io/statusline-copy.ts    # NEW: ls-remote, clone, pointer, prune, render (ports)
hooks/surfaces/pane.tsx        # footer draws runs when a render is present
hooks/register.tsx             # refresh on the clock, state, option, command, doctor row
types/index.d.ts               # SessionStats.statuslineRender, statuslineHealth
.claude-plugin/plugin.json     # option footerSource
tests/core/statusline-dep.test.ts, tests/integration/statusline-footer.test.tsx
```
