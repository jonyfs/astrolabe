# Implementation Plan: Footer and Statusline Parity

**Branch**: `068-footer-statusline-parity` (stacked on `067-specs-at-scale`) | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

## Summary

Add the chips that jonyfs/statusline draws and Astrolabe did not: merge conflicts, upstream-aware ahead and behind, detached HEAD, linked worktree origin, the start directory, repository name, PR draft state and labels, last CI run, skills in play, todo progress, spend limit and `fast`, the prompt cache and a burn rate with a projection. Chips keep one rank table, so narrow widths shed them in a fixed order. Branch, PR, skills and model brighten for 30 seconds after a change, and a hover row explains the chip under the pointer.

## Technical Context

Same toolchain as 064 to 067. No new dependency. Chip text is built by pure functions in `hooks/core/footer-chips.ts`; `footer.ts` places them by rank. Session facts (directory, skills, todo, cache) are gathered in memory by hooks and written with the next stats flush, so a tool call costs no state write. `gh` runs on `$.clock` at most every five minutes and lands in `$.state`; the draw path reads only state (Principle XII).

## Constitution Check

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | Hover sentences in four languages. |
| II Documentation With Examples | Pass | README footer section shows the three lines. |
| III Native Mod, Zero Settings | Pass | Nothing is written to `settings.json`. |
| IV Pure Core, Thin Surfaces | Pass | Chip builders and the shed order are pure. |
| V Disk Is the Truth | Pass | Git and `gh` facts come from the repository. |
| VI Test-First | Pass | `footer-chips.test.ts` and `footer.test.ts` precede the wiring. |
| VII Good Neighbor | Pass | One toast when the cache goes cold, already shown by the cache warning. |
| VIII Responsive by Width | Pass | Shed order is a table; ids and the branch are never cut. |
| IX Theme by Tokens | Pass | Chip colours come from the palette roles; ASCII icon sets fold marks. |
| X Presets Are Data | Pass | `CHIP_TABLE` holds rank and colour. |
| XI Honest Degradation | Pass | No upstream, no `gh`, no cache usage: the chip is absent, not guessed. |
| XII Nothing Slow on the Draw Path | Pass | Reads run on the clock; the draw reads state. |
| XIII Spec Kit for Every Change | Pass | This spec, umbrella 063. |
| XIV Verified Distribution | Pass | No packaging change. |

## Structure

```text
hooks/core/footer-chips.ts   # NEW: dir, repo, branch, tree, PR, CI, skills, todo, cache, burn chips, asciiFold
hooks/core/footer.ts         # CHIP_TABLE, three-line grouping, shed order
hooks/core/git-status.ts     # upstream, detached, CI run, PR draft and labels
hooks/core/i18n/*.ts         # chip.explain.<name> in four languages
hooks/register.tsx           # session facts, cache from step usage, gh run, origin, brighten rule
hooks/surfaces/pane.tsx      # hover scope per chip and the explain row
types/index.d.ts             # GitState, PullRequest, SessionStats additions
tests/core/{footer,footer-chips,git-status}.test.ts, tests/integration/{footer,git-footer,pane-footer}.test.ts*
```

Decisions are in [research.md](research.md).
