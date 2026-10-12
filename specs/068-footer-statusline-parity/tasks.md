---
description: "Task list for 068-footer-statusline-parity"
---

# Tasks: Footer and Statusline Parity

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md). Tests first (Principle VI). `#n` is the improvement number in the umbrella 063.

- [x] T001 [US1] #41 Tests for the git parity chips in `tests/core/footer-chips.test.ts` and `tests/core/git-status.test.ts`
- [x] T002 [US1] #41 `hooks/core/footer-chips.ts`, `parseCiRun` and upstream, detached and draft fields in `hooks/core/git-status.ts`
- [x] T003 [US1] #41 Directory, skills, todo, cache, CI and worktree origin gathered in `hooks/register.tsx`
- [x] T004 [US1] #41 Three-line grouping and the shed order in `hooks/core/footer.ts`
- [x] T005 [US2] #42 `cacheChip` and the cache fact from `turn.step` usage
- [x] T006 [US3] #45 `skillsChip` and the session's skills
- [x] T007 [US3] #46 `todoChip` from `TodoWrite`
- [x] T008 [US3] #47 `fast` beside the effort; the spend limit through the usage ramp
- [x] T009 [US4] #48 `burnChips` with five samples over a minute and a projection before the reset
- [x] T010 [US5] #49 Brighten only branch, PR, skills and model for 30 seconds
- [x] T011 [US5] #50 `chip.explain.*` in four languages and the hover row in `hooks/surfaces/pane.tsx`
- [x] T012 ASCII fold for the new marks (`asciiFold`) and its tests
- [x] T013 Update the footer, git-footer and pane-footer integration tests; regenerate the golden snapshots
- [x] T014 README footer section; tick umbrella T041, T042 and T045 to T050
