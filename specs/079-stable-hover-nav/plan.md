# Plan: Stable hover and arrow navigation

Absolute Boxes in `surfaces/pane.tsx` (`rowLinks`, the footer slot), `surfaces/band.tsx` (cards) and
`register.tsx` (`configBody` returns a `card` per option; the Setup body draws them after the rows at
`top = rows before + 1`). The selection is `PaneState.selectedOption` and `selectedPr`, moved by the
existing `ui.scroll` hook through `listSelection`, applied by a `ui.input` submit hook. Pure helpers:
`primaryPullAction` (`core/pulls.ts`), `nextOptionValue` (`core/setup-extras.ts`).
