---
track: quick
status: done
---

# Quick spec: Visual polish pass

**Created**: 2026-10-10 · **Source**: the open P3 items of spec 052 (design-ux). T031 (blank rows between Dashboard sections) stays skipped: the blank rows pushed the session KPIs below the first screen, so density wins.

Tasks run in the order written. Each became a failing test, then code.

## Tasks

- [x] T001 #20 The current task row is bold, with `⏱` at the right edge (052 T020)
- [x] T002 #29 Governor times read clock then distance: `14:00, in 2h13m` (052 T029)
- [x] T003 #32 From 100 columns the Dashboard KPI rows sit two to a line (052 T032)
- [x] T004 #37 Each `/astrolabe` command in Help has a `⧉` copy button (052 T037)
- [x] T005 #40 PR rows show the author and the age (052 T040)
- [x] T006 #42 The doctor's checks also as a Health block in Help (052 T042)
- [x] T007 #45 A footer chip cut to fit shows its whole text on hover (052 T045)
- [x] T008 #46 For the first three sessions the footer ends with a `/astrolabe help` chip (052 T046)

## Outcome

- The session count rides in the existing `welcomed` store value (`0.119.0|2`), so the store keeps one key.
- Copy is only for `/astrolabe` commands; optional `[..]` parts are dropped from the copied text.
- Times use the clock-then-distance form in the governor rows (override, lift, state, pace); the footer's countdown form stays, since it has a column budget.
