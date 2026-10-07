---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: Commands and keys

**Created**: 2026-10-07 · **Source**: roadmap #39; the owner typed `/astrolabe help` and got only the usage line

## Requirements

- **FR-001**: `/astrolabe help` MUST list every subcommand, the pane's four tabs with their keys,
  how to focus and close the pane, and where the options are.
- **FR-002**: An unknown argument MUST name itself and point at `/astrolabe help`.
- **FR-003**: Version 0.12.1; README updated. The rest of spec 025 (shortcut, rich status,
  Edit rows, tour, accessible mode) stays on the roadmap.

## Tasks

- [X] T001 Failing tests in `tests/integration/pane.test.tsx`
- [X] T002 `HELP` and the `help` branch in `hooks/register.tsx`
- [X] T003 README and version 0.12.1
- [ ] T004 #41 A keyboard shortcut for the pane
- [ ] T005 #42 A rich `/astrolabe status` (CommandOutput render)
- [ ] T006 #43 The Edit row names the task it ticked (ToolUse render)
- [ ] T007 #47 A first-run tour
- [ ] T008 #48 A text-only accessible mode
