---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick Spec: The Specs list starts on the specs that are not done

**Input**: "The list of specs should filter by default to the specs that are not complete, reducing the number of specs."

**Cause**: the status filter started on `all`; the finished specs filled the list (a project of a hundred specs shows ninety finished ones).

## Requirements

- **FR-001** The default status is `open`: no spec whose phase is `done` or `abandoned`.
- **FR-002** `s` cycles `open`, `all`, `progress`, `next`, `done`, `abandoned`; `open` has no chip, the other statuses do.
- **FR-003** A text typed in the filter box shows every spec, and a `#` jump sets the status to `all`.
- **FR-004** What the default leaves out is counted in one dim row: `✓ 57 done, 2 abandoned hidden · s shows them`.
- **FR-005** When every spec is hidden the list does not say `No features yet`, and the worktree rows still draw.

## Tasks

- [x] T001 `core/pane.ts`: `StatusFilter` `open`, `DEFAULT_STATUS`, the cycle, `filterFeatures`, `allHidden`
- [x] T002 `register.tsx`: the default, the hidden row, the jump, the label
- [x] T003 Four languages; tests in `tests/core/pane.test.ts`, `tests/integration/pane.test.tsx`, `specs-scale`, `specs-tree`; README, CHANGELOG, 0.140.0
