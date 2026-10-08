---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: The footer in the pane

**Created**: 2026-10-07 · **Source**: the owner asked to move the statusline footer into the pane, under Specs, Tasks, Session and Dashboard

## Problem

The footer (usage, context, model, git, cost, duration) lived in the one-line status entry under
the prompt, where it competes for width with Claude Code's own entries.

## Requirements

- **FR-001**: By default the footer MUST be drawn at the bottom of the `/astrolabe` pane on every
  tab, after a separator; on a tab shorter than the pane it MUST hold the last rows.
- **FR-002**: The status entry MUST then keep only the parts never dropped: the Spec Kit part and
  the deciding usage window, which the governor acts on.
- **FR-003**: The `footerIn` option (`pane`, `status`, `both`) MUST choose where the footer goes.

The engine has no pinned pane footer: Pane props carry the body's rows, so the footer is held at
the bottom by blank rows when the content is shorter, and follows the content when it is longer.

## Tasks

- [x] T001 Failing tests in `tests/integration/pane-footer.test.tsx`
- [x] T002 `footerInput`, the lead-only status entry, the pane footer, the `footerIn` option
- [x] T003 README, version 0.23.0
