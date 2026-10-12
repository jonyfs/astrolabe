# Implementation Plan: Pane in Five Tabs

**Branch**: `066-pane-five-tabs` (stacked on `065-band-and-status`) | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

## Summary

Reduce the pane from eight tabs to five (Specs, Tasks, Session, PRs, Setup), move help to an overlay, give the tab row tabs only and a legend row of key-verb buttons, and make badges count what needs the person. Then redesign the bodies: the Specs sections in a fixed order with empty states, the Tasks header and warning row, the Session usage bars with governor ticks, Setup groups, and the PRs table. The pure row models stay in `hooks/core/pane.ts` and `hooks/core/dashboard.ts`; `hooks/surfaces/pane.tsx` draws; `hooks/register.tsx` assembles per tab.

## Technical Context

Same toolchain as 064 and 065 (TypeScript with JSX, `claude plugin test .`, `npm test`). Nothing new in dependencies. All text through `hooks/core/i18n` with four languages.

## Constitution Check

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | New keys in four languages, same widths. |
| II Documentation With Examples | Pass | README "The /astrolabe pane" rewritten with examples. |
| III Native Mod, Zero Settings | Pass | Setup says changes save to `$.store`. |
| IV Pure Core, Thin Surfaces | Pass | Tab, badge, legend, section and empty-state logic are core functions. |
| V Disk Is the Truth | Pass | No new state except the help overlay flag in the pane state. |
| VI Test-First | Pass | Core tests precede each change; adapter tests on terminal and desktop. |
| VII Good Neighbor | Pass | Toasts stay one line and state changes only. |
| VIII Responsive by Width | Pass | Labels shorten by pane width: full, legend verbs, number and badge. |
| IX Theme by Tokens | Pass | Roles only. |
| X Presets Are Data | Pass | Tabs, legends and sections are tables. |
| XI Honest Degradation | Pass | Empty states name the cause, including no Spec Kit. |
| XII Nothing Slow on the Draw Path | Pass | Rows come from `$.state`. |
| XIII Spec Kit for Every Change | Pass | This spec, umbrella 063. |
| XIV Verified Distribution | Pass | No packaging change. |

## Structure

```text
hooks/core/pane-tabs.ts   # NEW: tab table, legacy mapping, badges, legend verbs, width forms
hooks/core/pane.ts        # sections in fixed order, empty states, tasks header, setup groups
hooks/core/i18n/*.ts      # tab, legend, empty state, setup group keys
hooks/surfaces/pane.tsx   # tab row, legend row, help overlay, PRs table
hooks/register.tsx        # per-tab assembly, help overlay flag, migration of the stored tab
types/index.d.ts          # PaneTab, PaneState.help
tests/core/pane-tabs.test.ts, tests/core/pane.test.ts, tests/integration/pane*.test.tsx
```

## Phases

Decisions in [research.md](research.md), shapes in [data-model.md](data-model.md), tasks in [tasks.md](tasks.md).
