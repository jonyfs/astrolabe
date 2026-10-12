---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Progress follows the files in real time

**Created**: 2026-10-12 · **Source**: the owner said the mod's progress is always out of date

## Root cause

The mid-turn sync (`reconcileNow`, spec 053) read the root's files and the `specs/` listing, but
never the active feature's own `spec.md`, `plan.md` and `tasks.md`. Those were read again only
when the turn ended, or when Claude's own Edit or Write named them. A box ticked by a shell
command, a subagent, an MCP file writer or another editor stayed unseen until the turn's end,
which in a long `/speckit-implement` is minutes. The only other timer was the idle poller, ten
minutes after a turn.

## Design

One cheap signal, no watcher: `activeFilesChanged` stats the three files (no read) and compares
their modification times with the last probe. Only a change causes a read, of that one feature.

- After a Bash command that is not a spec-making command, and after any `mcp__*` tool, one probe.
- While a turn runs, a probe every 2 seconds, armed by the prompt and stopped when the turn ends.
- A spec-making command, a subagent's return and a write under `.specify/` keep their full sync,
  which now also re-reads the active feature when a stat says it moved.
- The probe is guarded so two never overlap, and writes nothing when nothing moved.

## Tasks

- [x] T001 Failing tests: a Bash `sed -i`, a subagent and an MCP write that tick a task show the count at once (P1)
- [x] T002 `reconcileNow` re-reads the active feature when its files changed (P1)
- [x] T003 `activeFilesChanged`: three stats, no read, noted at session start and turn end (P1)
- [x] T004 A probe after other Bash commands and MCP tools, and every 2 seconds while a turn runs (P1)
- [x] T005 Tests that an unchanged file costs stats only and that the timer stops with the turn (P1)
