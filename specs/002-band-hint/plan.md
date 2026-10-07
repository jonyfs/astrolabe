# Implementation Plan: Band, prompt hint, presets and themes

**Branch**: `002-band-hint` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-band-hint/spec.md`

## Summary

Add two render sites on top of 001's state: an `AbovePrompt` band with a phase rail and a
progress bar, laid out by a pure function that degrades by width, and a `PromptHint` tail with
the next command. Presets and Catppuccin theme tokens are pure data in `hooks/core/`, chosen
through two `userConfig` pickers. The render hooks only read `astrolabe.speckit` from
`$.state`, so a reconcile redraws them without any read on the draw path.

## Technical Context

**Language/Version**: TypeScript with JSX (`h`), as in 001.

**Primary Dependencies**: none beyond the engine.

**Storage**: reads `$.state` `astrolabe.speckit` (written by 001's hooks). No new state.

**Testing**: `claude plugin test .`. Pure tests for `bandSegments`, `presets` and `theme`.
Render tests mount `AbovePrompt` and `PromptHint` on `terminal` and `desktop`, with a test
hook beneath that answers `ui.render` with a tree (research R1), and `test(name, { options })`
for presets and flavors.

**Target Platform**: terminal and Desktop Code tab draw both sites; VS Code and `-p` pass.

**Project Type**: Claude Code plugin (mod).

**Performance Goals**: zero file reads per draw (SC-005); layout is a handful of string
operations.

**Constraints**: Good Neighbor (Principle VII): the band always includes `await next(e)`;
the hint uses `tail` so the engine's line and pills stay. No literal colors outside
`hooks/core/theme.ts` (Principle IX).

**Scale/Scope**: one band row, one hint tail.

## Constitution Check

| Principle | How this plan complies | Status |
|---|---|---|
| I, II | English; README gains the band, the hint, both options and captures (FR-012). | Pass |
| III | `userConfig` in `plugin.json`; no settings writes; no new state. | Pass |
| IV | Layout in `hooks/core/band.ts`, `presets.ts`, `theme.ts`, all pure. `hooks/surfaces/band.tsx` and `hint.ts` turn segments into elements; every `$` call stays in `register.tsx` (engine rule). The surface receives the element table, not `$`. | Pass |
| V | Draws from reconciled state only. | Pass |
| VI | Tests first; every render test loops `['terminal', 'desktop']`. | Pass |
| VII | `await next(e)` always a child; `next(e)` alone when quiet; yields to surveys. | Pass |
| VIII | `bodyColumns` drives the band; tested 10 to 200 and at 80/100/144/200. | Pass |
| IX | Tokens per flavor; native `Box`/`Text`; no borders needed. | Pass |
| X | Presets are a data table; three presets. | Pass |
| XI | Missing state or Spec Kit: the sites pass. | Pass |
| XII | Render hooks read `$.state` only. | Pass |
| XIII, XIV | Full Spec Kit flow; version bumps to 0.2.0 (MINOR: two options added). | Pass |

## Project Structure

```text
hooks/core/band.ts         # bandSegments(state, columns) -> Segment[] (FR-003..FR-006)
hooks/core/hint.ts         # hintTail(state, isDraft) -> string | undefined (FR-007)
hooks/core/presets.ts      # PRESETS table and presetOf(options) (FR-008)
hooks/core/theme.ts        # FLAVORS tokens and themeOf(options) (FR-009)
hooks/surfaces/band.tsx    # segments -> <Box><Text color=…/></Box> given the element table
hooks/register.tsx         # + ui.render hooks for AbovePrompt and PromptHint
.claude-plugin/plugin.json # + userConfig preset, flavor; version 0.2.0
tests/core/{band,hint,presets,theme}.test.ts
tests/integration/{band,hint}.test.tsx
```

## Complexity Tracking

None.
