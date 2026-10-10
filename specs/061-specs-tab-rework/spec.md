---
track: quick
status: done
---

# Quick spec: Specs tab rework

**Created**: 2026-10-10 · **Source**: the owner asked for a Specs tab that is easier to judge, with filters and commands that make sense for the selected spec using gstack's skills, and thirty improvements.

Tasks run in the order written. Each became a failing test, then code. The count is 26, not 30: the rest would repeat these or need data the state does not hold (a spec's last-change age, a roadmap).

## Tasks

### Filters

- [x] T001 `phase:<name>` keeps the features at one phase
- [x] T002 `has:questions` keeps the features with open clarification markers
- [x] T003 `has:checklist` keeps the features with open checklist items
- [x] T004 `has:warning` keeps the features with a warning
- [x] T005 `has:worktree` keeps the features another worktree works on
- [x] T006 `track:quick|full` keeps one track
- [x] T007 `prio:high|low` keeps one priority
- [x] T008 `is:active` keeps the active feature (next to `is:progress|next|done|abandoned`)
- [x] T009 A muted row under the box names the active tokens and the count (`phase:plan · has:questions · 3/12 rows`)
- [x] T010 `c` clears the filter box and the status filter; the button shows only while one is on
- [x] T011 `o` cycles the order within a section: file order, most done first, by name
- [x] T012 The order's name is on the tab row (`o order: progress`)
- [x] T013 A filter that keeps nothing says `press c to see them all`
- [x] T014 Help lists the filter language and the two keys (in all four languages)

### The selected spec

- [x] T015 A detail line under the selected row: id, name and phase
- [x] T016 It counts the tasks left
- [x] T017 It names the open questions
- [x] T018 It shows the checklist items still open
- [x] T019 It marks a quick spec
- [x] T020 It shows a non-normal priority
- [x] T021 It names the worktrees working on the spec
- [x] T022 It names the Spec Kit command that moves the spec on (a non-active spec counts as analyzed)

### Commands

- [x] T023 gstack's skills offered fit the selected spec's phase (office-hours and plan-ceo-review early, plan-eng-review at plan and tasks, review, investigate, qa-only and health while implementing, retro and document-release at the end)
- [x] T024 The advisor button acts on the selected spec and needs a second press within ten seconds, because it costs a whole turn
- [x] T025 `⧉ /speckit-<next>` copies the command that moves the selected spec on; `a` presses the advisor button
- [x] T026 The pane's footer keeps its rows when the active spec's summary wraps (found by investigation: the header counted newlines, not wrapped rows)

## Outcome

- Filters and order are pure functions of the features, the priorities and the worktrees, so they cost nothing on the draw path.
- Skills per phase live in `skillsForPhase`; adding one is a line in a table.
