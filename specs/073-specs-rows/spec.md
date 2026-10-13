---
track: quick # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Ready to Close Group and Why-Active Line

**Feature Branch**: `073-specs-rows`

**Created**: 2026-10-13

**Status**: Draft

**Input**: Audit of the design canvas (board 6) against 0.135.0.

**Design reference**: `docs/design/astrolabe-redesign.html`, board b6.

## What the board shows and the code does not

- `◇ Ready to close 6 · all ticked, status: active` followed by one row `044 045 046 048 051 053 [ ⧉ ask Claude to close ]`.
- Under the active spec, `active: highest open spec (no feature.json, branch main)`.

## Requirements

- **FR-001**: In the Focus view, a Ready to close group of two or more specs MUST add one row after its heading with the ids and a button `⧉ ask Claude to close`; pressing it MUST put one prompt in the composer (never submit it) naming every spec's `spec.md`.
- **FR-002**: The active spec MUST have one faint row under its gates saying why it is active, when it was picked by the branch or as the highest open spec; a `feature.json` pick needs no row.
- **FR-003**: Four languages; the Specs rows of every other case are unchanged.

## Deliberately not changed

The board's 9-cell `▰▱` bar, the `quick` tag and the `plan.md ✓` marker on rows, and replacing `▲` by `⚠` conflict with the vocabulary of spec 064 and with row forms the tests and README describe; they are left for the owner to decide.

## Tasks

- [x] T001 Tests in `tests/core/pane.test.ts`
- [x] T002 `hooks/core/pane.ts`, `hooks/core/spec-actions.ts` (`closeAllSuggestion`), the surface action kind and the register wiring, i18n
