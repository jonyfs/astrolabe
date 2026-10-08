---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: A Help tab in place of the welcome card

**Created**: 2026-10-08 · **Source**: the owner asked to drop the welcome text from the Specs tab, which took a lot of room, and to give help its own tab

## Requirements

- **FR-001**: The Specs tab MUST NOT show the welcome card.
- **FR-002**: The pane MUST have a fifth tab, Help (key `5`), listing the `/astrolabe` commands,
  the pane and band keys, and the options, in the person's language.

## Tasks

- [x] T001 Test in `tests/integration/help-rest.test.tsx`
- [x] T002 The Help tab and its rows; the welcome card and its `welcomed` store key removed
- [x] T003 README, version 0.25.0
