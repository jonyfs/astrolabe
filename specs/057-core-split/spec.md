---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: Core split

**Created**: 2026-10-09 · **Source**: the plan review of every implemented spec; register.tsx is 3191 lines of mixed features and i18n.ts is one 1354-line file. Finishes 049's T010 on the way.

Tasks run P1 first. Each becomes failing tests, then code, then a release.

## Tasks

- [ ] T001 register.tsx keeps only wiring: each feature's code moves to its own module under `hooks/modules/`, the registration order written once in one place; each module's tests move with it (P2)
- [ ] T002 i18n.ts becomes `hooks/core/i18n/en.ts`, `pt-br.ts`, `es.ts` and `fr.ts` plus an index that re-exports `t()` with the same signature (P3)
- [ ] T003 Regression gate: `claude plugin test .` and `npx -y -p typescript@5 tsc -p .` give identical results before and after the split, checked before the branch lands (P1)
