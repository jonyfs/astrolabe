---
description: "Task list for 070-statusline-dependency"
---

# Tasks: Statusline as the Footer

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md). Tests first (Principle VI).

- [ ] T001 [US1] Tests for `buildPayload`, `parseAnsiLines`, `compatible`, `newestCompatible` and `chooseSource` in `tests/core/statusline-dep.test.ts`
- [ ] T002 [US1] `hooks/core/statusline-dep.ts` (pure)
- [ ] T003 [US2] Tests for the update flow on fake ports: first fetch, newer tag, same tag, failed clone, bad version, atomic pointer, prune, `checkUpdates=off`
- [ ] T004 [US2] `hooks/io/statusline-copy.ts`
- [ ] T005 [US3] Tests for the render flow: success, exit 1, hang, no output, control sequences, node missing, last-good reuse for 60 s
- [ ] T006 [US1] `render` in `hooks/io/statusline-copy.ts` with budget, trimmed environment and argv
- [ ] T007 [US1] Option `footerSource` in `plugin.json`, README and the Config tab groups
- [ ] T008 [US1] Wire the refresh on the clock in `hooks/register.tsx`; state fields in `types/index.d.ts`
- [ ] T009 [US1] The pane footer draws runs; the status entry draws plain lines; `footerOwner` respected
- [ ] T010 [US4] Setup rows (version, commit, checked, source, reason), `/astrolabe statusline update`, a `doctor` row
- [ ] T011 [US3] Integration tests: first session fetches, native fallback, draw path reads nothing
- [ ] T012 Constitution amendments III and XIV with rationale
- [ ] T013 README section "The footer is statusline", capture, CHANGELOG; suites; PR
