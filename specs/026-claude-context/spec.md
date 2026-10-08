---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Context for Claude

**Created**: 2026-10-07 · **Source**: roadmap 026 in `docs/roadmap.md`, picked by the owner

Done in 0.27.0. Tests: `tests/integration/claude-context.test.ts`, `tests/core/governor.test.ts`. T001 rides on the prompt (`prompt.submit` context), not the system prompt, so the cache stays whole.

## Tasks

- [x] T001 #50 The active feature, phase and current task in Claude's system prompt (`prompt.compose`)
- [x] T002 #51 A constitution reminder when a Spec Kit skill runs
- [x] T003 #52 Where the work stopped, in the resume prompt
- [x] T004 #53 A five-line session summary from a small model at feature end
- [x] T005 #54 `/astrolabe ask` about the feature through a fork of the session
