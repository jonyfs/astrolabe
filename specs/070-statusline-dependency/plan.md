# Implementation Plan: Statusline as the Footer

**Branch**: `070-statusline-dependency` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

## Summary

Vendor statusline's runtime under `vendor/statusline/`, keep it current through a CI sync pull request, run its CLI on the mod clock with a payload built from session state, and draw its lines under Astrolabe's native lead in the pane footer. The native footer remains the fallback and the `footerSource=native` choice.

## Technical Context

Same toolchain as 064 to 069. Core (pure): `hooks/core/statusline-dep.ts` (payload, ANSI runs, fallback detection, source choice, cut). IO (pure, takes closures): `hooks/io/statusline-run.ts` (the render and node probe given a `Proc` type). Wiring: `hooks/register.tsx` declares `procOf($)` and the refresh function (every `$` call stays in register). Surface: `hooks/surfaces/pane.tsx` draws runs. No new dependency.

## Constitution Check

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | Messages in four languages. |
| II Documentation With Examples | Pass | README section and a capture. |
| III Native Mod, Zero Settings | **Amend** | A bundled program keeps caches under `~/.claude/statusline/`; the mod writes nothing outside `$.store` and `$.state`. |
| IV Pure Core, Thin Surfaces | Pass | Payload, parser, rules are pure. |
| V Disk Is the Truth | Pass | Version and commit are read from `VERSION`; no second copy of the fact. |
| VI Test-First | Pass | Core, fault-injection and contract tests precede wiring. |
| VII Good Neighbor | Pass | No toast for a fallback; one dim row. |
| VIII Responsive by Width | Pass | `COLUMNS` passed; runs hard-cut to the width drawn. |
| IX Theme by Tokens | **Amend** | Colours of a dependency's output are data; flavor is mapped; colorblind falls back to native. |
| X Presets Are Data | Pass | Env mapping and cadence are tables. |
| XI Honest Degradation | Pass | Every failure ends in the native footer with a stated reason. |
| XII Nothing Slow on the Draw Path | **Document** | Render runs on the clock; the renderer's own detached `git`, `gh` and `rtk` probes are named in the README. |
| XIII Spec Kit for Every Change | Pass | This spec. |
| XIV Verified Distribution | **Amend** | A bundled dependency is pinned by commit and refreshed by a reviewed pull request. |

## Structure

```text
vendor/statusline/{bin,src,package.json,LICENSE,VERSION}   # NEW: the bundled runtime
scripts/sync-statusline.sh                                  # NEW: refresh + contract test
.github/workflows/sync-statusline.yml                       # NEW: weekly pull request
hooks/core/statusline-dep.ts                                # NEW (pure)
hooks/io/statusline-run.ts                                  # NEW (pure, takes a Proc)
hooks/surfaces/pane.tsx                                     # runs under the native lead
hooks/register.tsx                                          # procOf, refresh, option, command
types/index.d.ts                                            # astrolabe.footer state
.claude-plugin/plugin.json                                  # option footerSource
tests/core/statusline-dep.test.ts, tests/integration/statusline-footer.test.tsx,
tool-tests/unit/statusline-contract.vitest.ts
```
