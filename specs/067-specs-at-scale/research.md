# Research: Specs at Scale

## R1 When Focus is the default

**Decision**: Focus is the default for a project of more than 12 specs; a smaller project keeps the plain sections, in the fixed order of spec 066. `v` toggles Focus and All.

**Rationale**: below a dozen specs the whole list fits and a summary row only adds a line; above it the list is what grows.

## R2 Blocks and the active spec

**Decision**: blocks of 50 by id (`001–050`); in All the block that holds the active spec starts open. A block header is a button that folds and opens it, because a pane button takes a letter or digit, not an arrow.

## R3 The jump

**Decision**: a filter that starts with `#` is a jump: `#05` lists the ids that start with `05` (`# 05 → 050 051 … 059`) and Enter opens the block of the first one and selects it. The filter's text never filters rows when it starts with `#`.

## R4 Checks

**Decision**: four checks, all pure over the derived state plus `planMissing`: done with open tasks, duplicate ids, a dangling or malformed `feature.json`, and files plan.md names that are not there. The plan check reads the plan files of the active spec and of the ready-to-close ones (at most ten, twelve paths each) once per reconcile; it runs outside the draw path.

## R5 Duplicate ids

**Decision**: both folders stay as rows; the second takes the key `feature-<id>~1` and both end with `⚠ id×2`; the jump lists both folders.

## R6 Unknown figures

**Decision**: a spec from the tasks phase on with no task figures prints `?%` and `?`, never `0%`.

## R7 Fixtures

**Decision**: core tests build 140 specs in memory; integration tests use 60, because session start reads them all and 140 pushes a test past the 5 second limit under a loaded runner. The behaviour (two blocks, duplicates, checks, no reads on draw) is the same.
