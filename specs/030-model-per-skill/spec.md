---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Model and effort per skill

**Created**: 2026-10-07 · **Source**: roadmap 030 in `docs/roadmap.md`, picked by the owner

Done in 0.33.0. Test: `tests/integration/skill-models.test.ts`. The table lives in `hooks/core/skill-models.ts` and shows in the Help tab; `skillModels: auto` rewrites `turn.step`'s model and effort while the skill runs, then the session's model comes back. Off by default: a model switch re-reads the context.

## Tasks

- [x] T001 A table of the best model and effort for each gstack and Spec Kit skill
- [x] T002 A tab that shows it
- [x] T003 An `auto` mode: a `turn.step` hook sends the request with that model and effort while the skill runs
