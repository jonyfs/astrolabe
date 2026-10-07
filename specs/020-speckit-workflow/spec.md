---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: Spec Kit workflow, part one (the next command)

**Created**: 2026-10-07 · **Source**: roadmap 020 (#13, #14, #40, #45). The rest of 020 (#15, #16, #19, #20, #21, #22, #24) follows in part two.

## Requirements

- **FR-001**: Under the band, a row MUST show the next Spec Kit command as a button that runs it
  (`▶ /speckit-implement`), and from 60 columns a `copy` button that copies it and says so in a
  toast. Presets without the band show neither.
- **FR-002**: `/astrolabe next` MUST run the next command, started from a timer once `/astrolabe`
  has answered (a command does not run another inside its own dispatch); with none it says why.
- **FR-003**: Each new next command MUST be proposed once in the empty prompt box
  (`$.prompt.suggest`), at session start and after a turn, in interactive sessions with the band.
- **FR-004**: The labels follow the person's language (019). Version 0.14.0; README updated.

## Tasks

- [X] T001 Failing tests in `tests/integration/next-command.test.tsx`; stubs for `prompt.suggest` and `ui.copy` in the test helper
- [X] T002 `nextRow` in `hooks/surfaces/band.tsx`; `runNext`, `copyNext`, `suggestNext` and `/astrolabe next` in `hooks/register.tsx`; dictionary entries
- [X] T003 README and version 0.14.0
- [X] T004 Part two (0.15.0): #15 open checklist items in the pane, #16 the count of `[NEEDS CLARIFICATION]` markers in the pane, #20 the feature-done toast names `/speckit-converge`, #24 a test task ticked with no test file changed; tests in `tests/core/workflow-signals.test.ts`
- [ ] T005 Part three: #19 `[P]` tasks suggested as subagents, #21 several Spec Kit roots, #22 Spec Kit extensions
