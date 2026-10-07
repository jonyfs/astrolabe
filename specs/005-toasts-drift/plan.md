# Implementation Plan: Phase toasts and the drift alarm

**Branch**: `005-toasts-drift` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Two pure modules decide what to say: `hooks/core/phase-toast.ts` (`phaseToasts`) and
`hooks/core/drift.ts` (`newlyTicked`, `namedPaths`, `detectDrift`, window updates). The memo
gains `window`, `toasted` and `baselined`. `register.tsx` records Bash and Agent calls and code
edits into the window, runs `detectDrift` after a `tasks.md` edit, runs `phaseToasts` after
`session.start` and `turn.complete` reconciles with the store's baseline, and calls
`$.ui.toast`.

## Constitution Check

| Principle | Compliance | Status |
|---|---|---|
| III | Persistent values only in `$.store` (`baseline:<root>`); session values in the memo. | Pass |
| IV | Decisions pure; `$.store` and `$.ui.toast` only in `register.tsx`. | Pass |
| V | Phase toasts only on disk-confirmed reconciles, never hints. | Pass |
| VI | Tests first. | Pass |
| VII | A toast marks a change of state, never every turn; once per key per session. | Pass |
| X | Gated by the preset's `toasts` field. | Pass |
| XII | No toast or store call on a draw path. | Pass |
| XIV | Version 0.5.0. | Pass |

## Project Structure

```text
hooks/core/phase-toast.ts   hooks/core/drift.ts
hooks/io/reconcile.ts       # window updates on file touches; window reset on tick
hooks/register.tsx          # Bash/Agent hooks, store baseline, toasts
types/index.d.ts            # memo: window, toasted, baselined
tests/core/{phase-toast,drift}.test.ts  tests/integration/toasts.test.ts
```

## Complexity Tracking

None.
