---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: The spinner narrates from the first read

**Created**: 2026-10-07 · **Source**: pre-submission audit (`docs/reports/pre-submission-audit.md`), "Spinner narration starts late"

## Problem

The spinner named the current task only after `/speckit-implement` ran or a tool edited a file
in the active feature during the turn. A turn usually reads `tasks.md` or `spec.md` first, so in
a short turn the narration showed for a second or two at the end.

## Requirements

- **FR-001**: A `Read` of a file in the active feature's folder MUST mark the turn as working on
  it before the read runs, so the spinner narrates from then on. It reads nothing from disk.
- **FR-002**: Later reads of the same feature in the turn MUST write no state. A read of any other
  path (code, another feature, a folder outside the root) changes nothing, and a read is never
  counted as an edit by the drift alarm.
- **FR-003**: Version 0.9.2; README and audit report updated.

## Tasks

- [X] T001 Failing tests in `tests/integration/spinner.test.tsx`: a Read of the active feature narrates, a second one writes nothing, the turn end clears it; other reads change nothing
- [X] T002 `applyRead` in `hooks/io/reconcile.ts` and the `Read` hook in `hooks/register.tsx`
- [X] T003 README, audit report, version 0.9.2
