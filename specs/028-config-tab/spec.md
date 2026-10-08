---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Config tab

**Created**: 2026-10-07 · **Source**: roadmap 028 in `docs/roadmap.md`, picked by the owner

Done in 0.30.0. Test: `tests/integration/config-tab.test.tsx`. The rows come from `$.config.list()` (the `astrolabe.*` keys), read at session start and after a save.

## Tasks

- [x] T001 A pane tab with an editable form of every option
- [x] T002 A Save button that applies the changes through `$.config.set`; the mod reloads with them
