# Implementation Plan: Spinner narrates the current task

**Branch**: `003-spinner-narration` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

A pure `spinnerSuffix(state, memo, now, columns)` in `hooks/core/spinner.ts` decides the text;
a `ui.render` hook on `Spinner` in `register.tsx` rewrites `suffix` through
`next({ ...e, props: { ...e.props, suffix } })`, reading `$.state` and `$.clock.now()` only.
"Worked on this turn" uses 001's turn-scoped memo: `runningSkill.step === 'implement'` or the
active dir in `memo.touched` (both cleared at `turn.complete`).

## Technical Context

TypeScript/JSX as before; no new dependency or state. Tests: pure tests for the suffix and
render tests mounting `Spinner` on `terminal` and `desktop`.

## Constitution Check

| Principle | Compliance | Status |
|---|---|---|
| IV | Logic pure in `hooks/core/spinner.ts`; `$` only in `register.tsx`. | Pass |
| VI | Tests first, both surfaces. | Pass |
| VII | Rewrites only `suffix`; word, time and tokens stay; no tree of its own. | Pass |
| VIII | Fits `viewport.columns`; never cuts an id. | Pass |
| X | Gated by the preset's `spinner` flag (already declared). | Pass |
| XII | Reads `$.state` and the clock; no files. | Pass |
| XIV | Version 0.3.0 (MINOR, new behavior). | Pass |

## Project Structure

```text
hooks/core/spinner.ts                    # cleanTaskText, formatElapsed, spinnerSuffix
hooks/register.tsx                       # + ui.render on Spinner
tests/core/spinner.test.ts
tests/integration/spinner.test.tsx
tests/helpers/render.tsx                 # + drawSpinner
```

## Complexity Tracking

None.
