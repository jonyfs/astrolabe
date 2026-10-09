---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: The tabs follow what Claude does

**Created**: 2026-10-08 · **Source**: the owner asked that the tabs stay in sync with what is happening in Claude

## Root cause

Astrolabe read the Spec Kit state again only when a turn ended, or when an Edit or Write
touched `spec.md`, `plan.md` or `tasks.md`. A write of `.specify/feature.json` or of the
constitution, a Bash command that made a spec or switched the branch, and a subagent's work
all waited for the turn to end, so during a long `/speckit-implement` the tabs lagged by
minutes.

## Tasks

- [x] T001 Failing tests: a Write of feature.json and a Bash command that makes a spec show at once (P1)
- [x] T002 `reconcileNow`: the root's files and the specs/ listing again, the turn's memo kept, nothing written when nothing moved (P1)
- [x] T003 After every Bash command, after a subagent returns, and after a write under `.specify/` (P1)
- [x] T004 The Session tab's activity rows refresh on each tool call, not each turn (P2)
- [x] T005 git status after a Bash command that ran git, not only at the turn's end (P2)
