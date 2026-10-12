# Implementation Plan: Design Tokens

**Branch**: `064-design-tokens` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/064-design-tokens/spec.md`

## Summary

Give every surface one visual vocabulary. The work is a set of small pure modules in `hooks/core/` that replace values now repeated in `footer.ts`, `governor.ts`, `pane.ts`, `summary.ts`, `dashboard.ts`, `toasts.ts` and `register.tsx`, plus one new theme role (`faint`), one more (`warn`, the yellow the ramp needs), and three guard tests: contrast, glyph width and no literal colour in an adapter. Existing surfaces are switched to the modules, snapshot tests pin them in five flavors at four widths, and the README captures are regenerated.

Nothing new is drawn. Where a surface already shows a value, it now shows it through the shared module.

## Technical Context

**Language/Version**: TypeScript 5, ES modules, Node 20 or newer (`package.json` engines).

**Primary Dependencies**: none new. Test tooling already present: vitest, tsx, playwright, sharp.

**Storage**: none. All new modules are pure; `$` is never touched in `hooks/core/` (Principle IV).

**Testing**: `vitest run` (`tests/core/*.test.ts`, `tests/integration`, adapter tests through `tests/helpers/render.tsx`). `npm run typecheck`.

**Target Platform**: Claude Code mod, terminal and desktop surfaces.

**Project Type**: Claude Code mod (pure core in `hooks/core`, thin adapters in `hooks/surfaces` and `hooks/register.tsx`).

**Performance Goals**: no new work on the draw path; every new function is O(input) with no I/O (Principle XII).

**Constraints**: colours only from `theme.ts` (IX); width measured only by `textWidth` (VIII); English strings with en, pt-BR, es and fr copies of equal width (I); README and images in the same pull request (II).

**Scale/Scope**: 10 improvements, about 8 new or changed core modules, 6 call-site families, 5 flavors, 4 widths.

## Constitution Check

*GATE: passed before Phase 0, re-checked after Phase 1.*

| Principle | Result | Note |
|---|---|---|
| I English-Only | Pass | New strings in `en`, with `pt-br`, `es`, `fr` copies of the same width. |
| II Documentation With Examples | Pass | README sections and captures regenerated. |
| III Native Mod, Zero Settings | Pass | No setting is written. `faint` and `warn` are theme roles only. |
| IV Pure Core, Thin Surfaces | Pass | All new logic lives in `hooks/core`; adapters call it. |
| V Disk Is the Truth | Pass | No new state. |
| VI Test-First | Pass | Tasks order tests before changes; red first for contrast, width, literal-colour. |
| VII Good Neighbor | Pass | Toast prefix changes only; no new interruption. `next(e)` untouched. |
| VIII Responsive by Width | Pass | Ids never cut; `textWidth` stays the single measure. |
| IX Theme by Tokens | Pass | Adds roles, removes a literal-colour risk with a guard test. |
| X Presets Are Data | Pass | The phase and key tables are data in one place. |
| XI Honest Degradation | Pass | Unknown duration prints `?`; unknown usage prints no mark. |
| XII Nothing Slow on the Draw Path | Pass | Pure formatting only. |
| XIII Spec Kit for Every Change | Pass | This spec, umbrella 063. |
| XIV Verified Distribution | Pass | No packaging change. `plugin.json` untouched here. |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/064-design-tokens/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tokens-api.md
├── checklists/requirements.md
└── tasks.md            # created by /speckit-tasks
```

### Source Code (repository root)

```text
hooks/core/
├── theme.ts            # + roles faint, warn; latte/colorblind values; THEME_TOKENS keys
├── usage-ramp.ts       # NEW  one ramp: percent + thresholds -> level, role, chip colour, mark, full
├── duration.ts         # NEW  one duration and reset format
├── message.ts          # NEW  one prefix: astrolabe ✓ / astrolabe ▲
├── keys.ts             # NEW  one key-verb table
├── zones.ts            # NEW  zone and item separators
├── ids.ts              # NEW  task id as written, feature id padded to the widest
├── glyphs.ts           # NEW  STATE_GLYPHS (‖ ◷ ▲) and the declared emoji-wide entries
├── phase.ts            # + PHASE_SHORT table and phaseShort()
├── icons.ts            # MARKS: ⏸ ⏱ ⚠ rows replaced by ‖ ◷ ▲
├── footer.ts           # uses usage-ramp, duration, zones; textWidth loses the ⏳ ⏱ ⚠ special cases
├── governor.ts         # uses duration for reset and span text
├── pane.ts             # uses duration, ids, keys, phaseShort, faint
├── summary.ts          # uses duration
├── dashboard.ts        # uses duration, usage-ramp
├── toasts.ts           # prefix from message.ts
├── status-text.ts      # prefix and separators from message.ts and zones.ts
└── i18n/{en,pt-br,es,fr}.ts   # glyph and prefix strings

hooks/surfaces/ and hooks/register.tsx   # call the modules; no literal colours

tests/core/
├── usage-ramp.test.ts
├── duration.test.ts
├── message.test.ts
├── keys.test.ts
├── zones.test.ts
├── ids.test.ts
├── glyphs.test.ts          # width test over icon sets and state glyphs
├── theme.test.ts           # + faint and warn in the contrast loop
├── no-literal-colour.test.ts
└── snapshots.test.ts       # band, status, footer, pane x 5 flavors x 4 widths

scripts/generate-images.ts  # flavor matrix of captures
README.md, docs/images/     # regenerated
```

**Structure Decision**: single-package mod. New modules sit beside the ones they replace in `hooks/core/`, one concern per file, each with its own test file, matching the existing layout (`governor.ts` and `governor.test.ts`).

## Phases

- **Phase 0** produced [research.md](research.md): the contrast measurements, the yellow role decision, the duration rule, the width test scope.
- **Phase 1** produced [data-model.md](data-model.md), [contracts/tokens-api.md](contracts/tokens-api.md) and [quickstart.md](quickstart.md).
- **Phase 2** (`/speckit-tasks`) turns this into `tasks.md`.

## Risks

- Seconds in every duration (`4m12s`) change footer text once a second where it changed once a minute. The footer already redraws on the clock tick; research.md R3 confirms no extra reads.
- Snapshot suites are large. They are generated from fixtures with fixed `now`, and run in the normal `vitest run`.
- Latte's overlay2 value is below 4.5:1, so "the matching value in each flavor" is adjusted for latte (research.md R1).
