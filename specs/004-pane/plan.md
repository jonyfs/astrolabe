# Implementation Plan: The /astrolabe pane

**Branch**: `004-pane` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Pure view models in `hooks/core/pane.ts` (`specsRows`, `taskRows`, `sessionRows`) turn the held
state into rows; `hooks/surfaces/pane.tsx` turns rows into `Box`/`Text`/`Button` given the
element table and tokens. `register.tsx` registers the command, opens the pane, draws it, keeps
the tab in `$.state` (`astrolabe.pane`), records the last fullscreen width from the band's
render in a module variable, and opens the pane unasked at `turn.complete` under FR-004.

## Constitution Check

| Principle | Compliance | Status |
|---|---|---|
| III | New `$.state` key `pane` declared in `types/index.d.ts`. | Pass |
| IV | View models pure; `$` only in `register.tsx`. | Pass |
| VI | Tests first; pane tests on terminal and desktop. | Pass |
| VII | Never opens unasked below 144 columns, only in fullscreen, once; no `holdToasts`. | Pass |
| VIII | Rows sized to `bodyColumns`; ids never cut. | Pass |
| IX | Tokens only. | Pass |
| XII | Draw reads `$.state`; the width note is a module variable written during draw, not a read. | Pass |
| XIV | Version 0.4.0 (MINOR: a command added). | Pass |

## Project Structure

```text
hooks/core/pane.ts          # tab rows (pure)
hooks/surfaces/pane.tsx     # rows -> elements
hooks/register.tsx          # command, open, Pane render, tab state, unasked open
types/index.d.ts            # + astrolabe.pane { tab }
tests/core/pane.test.ts
tests/integration/pane.test.tsx
```

## Complexity Tracking

None.
