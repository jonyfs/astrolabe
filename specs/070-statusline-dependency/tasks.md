---
description: "Task list for 070-statusline-dependency"
---

# Tasks: Statusline as the Footer

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md). Tests first (Principle VI).

- [ ] T001 [US3] `scripts/sync-statusline.sh` and a first `vendor/statusline/` with `VERSION`; contract test `tool-tests/unit/statusline-contract.vitest.ts` (exit 0, no fallback text, lines within `COLUMNS`, env names read)
- [ ] T002 [US3] `.github/workflows/sync-statusline.yml`: weekly and manual, opens a pull request, fails without one when the contract test fails
- [ ] T003 [US1] Tests for `buildPayload` (every mapping row, ISO to epoch seconds, absent fields), `parseAnsiLines` (24-bit, 256, 16, attributes, OSC 8 with BEL and ST, unterminated, `ESC[2J`), `isFallback`, `chooseSource`, `cutRuns` in `tests/core/statusline-dep.test.ts`
- [ ] T004 [US1] `hooks/core/statusline-dep.ts`
- [ ] T005 [US2] Tests for the render flow on a fake `Proc`: success, exit 1, hang, no output, fallback line with exit 0, Node 14 line, last good for 60 s, backoff, env keys exactly as FR-006
- [ ] T006 [US2] `hooks/io/statusline-run.ts`
- [ ] T007 [US1] Option `footerSource` in `plugin.json`, README and the Config tab group; `astrolabe.footer` state in `types/index.d.ts`
- [ ] T008 [US1] `procOf($)`, the refresh (session start, turn end, usage reading, pane open, 30 s timer, 5 s floor, one in flight, stale at 90 s) and the option change in `hooks/register.tsx`; a test that no `$` appears in `hooks/io/statusline-run.ts`
- [ ] T009 [US1] The pane footer draws the native lead and the runs (links when `Link` exists); resize cut; fallback row
- [ ] T010 [US4] Setup rows (source, version, commit, reason) and `/astrolabe statusline`
- [ ] T011 [US2] Integration tests: terminal and desktop, draw reads nothing, identical output writes no state, `footerSource=native` runs no process, colorblind falls back, footerOwner
- [ ] T012 Constitution amendments III, IX, XIV with a Sync Impact Report (1.1.0)
- [ ] T013 README section, capture, CHANGELOG; suites; PR
