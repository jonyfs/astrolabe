---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Specs running in other worktrees

**Created**: 2026-10-08 · **Source**: the owner saw the Specs tab miss the specs being worked on and their status

## Problem

Two causes. `.specify/feature.json` is local and gitignored; nothing moved it when work started on a
quick spec, so it still named a finished feature. And the work ran in another git worktree
(`../astrolabe-dev`), whose ticked tasks the session's folder only sees after a merge.

## Requirements

- **FR-001**: After each main turn, on a timer, Astrolabe MUST read `git worktree list --porcelain`
  in the Spec Kit root and, for each other worktree whose branch names a feature (`NNN-...`), read
  that feature's files there.
- **FR-002**: The Specs tab MUST list each one under the features, with the worktree's name, the
  feature, its phase and its task count (`⑂ dev  ◐ 026 claude-context  implement 1/3`).
- **FR-003**: Outside a git repository, or with one worktree, nothing changes.

## Tasks

- [x] T001 Test in `tests/integration/worktree-specs.test.ts`
- [x] T002 `hooks/core/worktrees.ts`, `refreshWorktrees`, the Specs rows
- [x] T003 README, version 0.26.0
