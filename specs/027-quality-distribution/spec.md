---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: Quality and distribution

**Created**: 2026-10-07 · **Source**: roadmap 027 in `docs/roadmap.md`, picked by the owner

In progress. T001 and T006 shipped in 0.34.0 as `tests/core/load-pure.test.ts` (500 features read and derived inside a tenth of the hook budget, at most four file calls each); the load test also found that through the engine each call costs far more, which spec 040 addresses. T004 is `docs/privacy.md`. T002, T003 and T005 need the real app or the owner (captures, directory art).

## Tasks

- [x] T001 #55 A performance benchmark in CI
- [ ] T002 #56 README images built in CI (including the footer and the Dashboard from 018)
- [ ] T003 #57 Desktop app captures
- [x] T004 #58 A privacy page: what the mod reads, keeps and sends
- [ ] T005 #59 Art and texts for the plugin directory
- [x] T006 #60 A 500-feature load test under the hook budget
