---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Quick specs show their tasks

**Created**: 2026-10-07 · **Source**: the owner asked why the specs did not show in the list with their tasks and status

## Problem

Quick specs keep their tasks in a `## Tasks` section of `spec.md`, but Astrolabe counted tasks
only from `tasks.md`, so every quick spec showed no progress and an empty Tasks tab. The
roadmap's specs (020c to 032) were only rows in `docs/roadmap.md`, not folders under `specs/`,
so they did not show at all.

## Requirements

- **FR-001**: Without a `tasks.md`, a quick spec's `## Tasks` section MUST be its task list:
  progress, the Tasks tab, the current task and the spinner. A `tasks.md` still wins; a full spec
  never reads tasks from `spec.md`.
- **FR-002**: Each roadmap spec MUST exist as a quick spec under `specs/` with its items as open
  tasks.
- **FR-003**: Version 0.15.1.

## Tasks

- [X] T001 Failing tests in `tests/io/snapshot.test.ts` and `tests/core/phase.test.ts`
- [X] T002 `quickTasks` in `hooks/io/snapshot.ts`
- [X] T003 Quick specs 021 to 032 (and the rest of 025) under `specs/`; version 0.15.1
