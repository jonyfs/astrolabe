---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Humanize option

**Created**: 2026-10-07 · **Source**: roadmap 029 in `docs/roadmap.md`, picked by the owner

Done in 0.31.0. Test: `tests/integration/writing-style.test.ts`. The section text is fixed and added last with `scope: 'session'`, so it never moves the prompt cache boundary.

## Tasks

- [x] T001 A revised, shorter version of the humanizer rules
- [x] T002 An option that adds them to Claude's system prompt (`prompt.compose`) for everything Claude writes in the project
