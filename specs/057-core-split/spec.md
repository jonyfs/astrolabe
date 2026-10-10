---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: Core split

**Created**: 2026-10-09 · **Source**: the plan review of every implemented spec; register.tsx is 3191 lines of mixed features and i18n.ts is one 1354-line file. Finishes 049's T010 on the way.

Tasks run P1 first. Each becomes failing tests, then code, then a release.

## Tasks

- [x] T001 The pure helpers of register.tsx move to `hooks/modules/` (help, guards, advisor, context, history-rows, durations, pane-data); their tests keep passing through register's re-exports. Code that takes `$` stays in register.tsx: the engine refuses `$` outside the file that declares `register` (see mod-engine quirks), so a feature's hooks cannot move out (P2)
- [x] T002 i18n.ts becomes `hooks/core/i18n/en.ts`, `pt-br.ts`, `es.ts` and `fr.ts` plus an index that re-exports `t()` with the same signature (P3)
- [x] T003 Regression gate: `claude plugin test .` and `npx -y -p typescript@5 tsc -p .` give identical results before and after the split, checked before the branch lands (P1)


## Outcome

T001 moved 563 pure lines; the 2630 lines that use `$` cannot leave register.tsx. `claude plugin test .` went from 701 to 702 passing (one new test for the review buttons), `tsc` and `claude plugin validate .` are clean.
