---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Terse mode

**Created**: 2026-10-07 · **Source**: roadmap 031 in `docs/roadmap.md`, picked by the owner

Done in 0.31.0. Test: `tests/integration/writing-style.test.ts`. The section text is fixed and added last with `scope: 'session'`, so it never moves the prompt cache boundary.

## Tasks

- [x] T001 An option that adds a terse-answer section to the system prompt, levels `lite` and `full`
