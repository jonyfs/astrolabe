# Implementation Plan: Band and Status

**Branch**: `065-band-and-status` (stacked on `064-design-tokens`) | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

## Summary

Rebuild the band as one row and the status entry as one lead line, using the vocabulary of spec 064. The pure model in `hooks/core/band.ts` returns segments (text, role, optional chip, link or action) for one row, chosen by a drop order against the columns left after the right-edge buttons. `hooks/surfaces/band.tsx` draws the segments, the update and hide buttons at the right edge, and chips with a background. `hooks/register.tsx` stops drawing the separate `updates:` row and the separate next row, and offers the next command through the prompt suggestion while the prompt is empty. A new `hooks/core/status-lead.ts` produces the status entry lead.

## Technical Context

**Language/Version**: TypeScript with JSX (`h` factory), Node 20 for scripts; the mod runs on the Claude Code mod engine.

**Primary Dependencies**: none new. Elements `Box`, `Text`, `Button` and `Link` come from `$.ui.resolve(e)`.

**Testing**: `claude plugin test .` (core tests in `tests/core`, adapters through `tests/helpers/render.tsx` on terminal and desktop), `npm test` for Node scans, `claude plugin validate .`.

**Constraints**: colours only from `theme.ts` (IX); width from `textWidth` (VIII); `next(e)` stays in AbovePrompt (VII); nothing slow or read on the draw path (XII); nothing written to the project or settings (III).

**Scale/Scope**: one core module rewritten, one new core module, two surface files, one render handler and the status drawing in `register.tsx`.

## Constitution Check

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | New strings in `en` with `pt-br`, `es`, `fr` copies. |
| II Documentation With Examples | Pass | README sections "What the band shows", "What the status entry shows", "The next command" updated; captures listed as follow-up capture. |
| III Native Mod, Zero Settings | Pass | The lift button uses the existing `/astrolabe allow` machinery in the mod store. |
| IV Pure Core, Thin Surfaces | Pass | Layout choices live in `core/band.ts` and `core/status-lead.ts`. |
| V Disk Is the Truth | Pass | The band reads `$.state` only. |
| VI Test-First | Pass | Core tests precede each change. |
| VII Good Neighbor | Pass | `next(e)` is awaited right under the band and rows from other mods stay. |
| VIII Responsive by Width | Pass | One drop order; id, step, n/m and the deciding window never drop. |
| IX Theme by Tokens | Pass | Chips use roles; foreground by `chipForeground`. |
| X Presets Are Data | Pass | `bandDensity` and the presets stay data. |
| XI Honest Degradation | Pass | Missing agent counts are not drawn; unknown reset prints nothing. |
| XII Nothing Slow on the Draw Path | Pass | Counts and decision come from `$.state`. |
| XIII Spec Kit for Every Change | Pass | This spec, umbrella 063. |
| XIV Verified Distribution | Pass | No packaging change. |

## Project Structure

```text
hooks/core/
├── band.ts             # rewritten: one row, chips, drop order, quick rail, governor takeover
├── status-lead.ts      # NEW  the status entry lead at 200, 144, 100 and 80 columns
├── next-command.ts     # the hint and the suggestion never both
├── hint.ts             # PromptHint shows the next command only with text
└── i18n/{en,pt-br,es,fr}.ts
hooks/surfaces/band.tsx # draws chips, links, the right-edge buttons
hooks/register.tsx      # AbovePrompt, PromptHint, status drawing
tests/core/{band,status-lead,hint}.test.ts
tests/integration/{band,next-command,hint,footer}.test.tsx
```

**Structure Decision**: the band keeps its segment model so the hover cards and the running dots stay; chips and links are two new optional fields on `Segment`.

## Phases

Research decisions are in [research.md](research.md), shapes in [data-model.md](data-model.md), validation in [quickstart.md](quickstart.md). Tasks come from `/speckit-tasks`.
