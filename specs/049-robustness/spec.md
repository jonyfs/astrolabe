---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: Performance and robustness

**Created**: 2026-10-08 · **Source**: the owner picked all 100 improvements in the Astrolabe 100 list; done ones (#30 per session, #91 to #95, #100) are left out

Tasks run P1 first. Each becomes failing tests, then code, then a release.

## Tasks

- [x] T001 #81 A test that fails when a pane render passes 30 ms on 100 features (P2)
- [ ] T002 #82 One state read per render, passed down (P2)
- [ ] T003 #84 git status only when a tool touched files or HEAD moved (P2)
- [x] T004 #85 Every array in $.state capped, with tests (P2)
- [ ] T005 #86 Timers cancelled when a newer turn replaces them (P2)
- [ ] T006 #87 Module state that matters kept in $.state or $.store (P2)
- [ ] T007 #88 Windows path tests for worktrees, roots and links (P2)
- [x] T008 #89 Fault injection: every read and process fails, nothing throws (P2)
- [ ] T009 #83 Footer redraws coalesced within 200 ms (P3)
- [ ] T010 #90 register.tsx split into feature modules (P3)
