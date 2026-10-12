# Implementation Plan: Specs at Scale

**Branch**: `067-specs-at-scale` (stacked on `066-pane-five-tabs`) | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

## Summary

Add a Focus view and an All view to the Specs tab, grouped in blocks of 50, with a checks row, placeholder rows for specs not read yet, absent figures printed as `?`, a scroll thumb, a grouping key and a Touched section. The pure parts live in `hooks/core/specs-scale.ts`, `hooks/core/sections.ts` and `hooks/core/thumb.ts`; `hooks/core/pane.ts` builds the rows; `hooks/register.tsx` holds the view, open blocks and grouping in the pane state and reads the plan files once per reconcile.

## Technical Context

Same toolchain as 064 to 066. No new dependency. The draw path reads only `$.state` (Principle XII): `planMissing` is written by the reconcile hook, never while drawing.

## Constitution Check

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | Keys in four languages. |
| II Documentation With Examples | Pass | README Specs section updated. |
| III Native Mod, Zero Settings | Pass | Ready to close is a prompt suggestion; nothing is written to the project. |
| IV Pure Core, Thin Surfaces | Pass | Blocks, counts, checks and runs are pure functions. |
| V Disk Is the Truth | Pass | Counts come from the derived state. |
| VI Test-First | Pass | Core tests precede the rows; integration tests on a 60-spec tree. |
| VII Good Neighbor | Pass | No new toasts. |
| VIII Responsive by Width | Pass | Rows fit the pane; ids are never cut. |
| IX Theme by Tokens | Pass | Roles only. |
| X Presets Are Data | Pass | Groupings and sections are tables. |
| XI Honest Degradation | Pass | Absent figures print `?`; unread specs say so. |
| XII Nothing Slow on the Draw Path | Pass | `planMissing` is read after a reconcile, once per memo version. |
| XIII Spec Kit for Every Change | Pass | This spec, umbrella 063. |
| XIV Verified Distribution | Pass | No packaging change. |

## Structure

```text
hooks/core/sections.ts      # NEW: section order, displaySectionOf, isReadyToClose
hooks/core/specs-scale.ts   # NEW: blocks, counts, checks, runs, groupings, jump
hooks/core/thumb.ts         # NEW: the scroll thumb
hooks/core/pane.ts          # scale rows, ?%, duplicate ids
hooks/core/spec-actions.ts  # closeSuggestion, planFiles
hooks/register.tsx          # pane state, jump, block toggle, plan files check, touched specs
types/index.d.ts            # PaneState.view, open, group; SessionStats.touchedSpecs, planMissing
tests/core/{specs-scale,thumb}.test.ts, tests/core/pane.test.ts, tests/integration/specs-scale.test.tsx
```

Decisions are in [research.md](research.md).
