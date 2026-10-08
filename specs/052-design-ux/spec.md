---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: 50 design and UX improvements

**Created**: 2026-10-08 · **Source**: the owner asked for 50 design and UX improvements. Each one
comes from reading the code as of v0.51.0 and repeats no open task of specs 041 to 050.

Tasks run P1 first. Each becomes failing tests, then code, then a release.

## Tasks

### The pane's frame

- [x] T001 #1 Below 80 columns the tab row turns each label into its number and badge (`1·3 2·11`), so seven tabs, `f`, `p` and `✕` never wrap (P1)
- [ ] T002 #2 The tab shown also gets `▸` before its label, beyond the button's colour (P2)
- [x] T003 #3 The legend row cuts the tab's description first and keeps the keys whole (P1)
- [ ] T004 #4 The pane's title names the active feature (`🧭 Astrolabe · 026 claude-context`) (P2)
- [ ] T005 #5 One label width for Session, Dashboard and Help, taken from the longest label instead of the fixed 14 and 10 (P1)
- [ ] T006 #6 Section headers drawn bold with the count muted, instead of plain muted text (P2)
- [x] T007 #7 A filter that matches nothing says so and how to clear it (`no rows hold "xyz"; empty the filter`) (P1)
- [ ] T008 #8 The filter field shows how many rows it keeps (P3)

### Specs tab

- [ ] T009 #9 The active feature's summary shows its first two lines, with the rest one press away (P2)
- [x] T010 #10 The Done section folds to one row (`Done (12)`) until opened (P1)
- [x] T011 #11 The Abandoned section folds to its count as well (P2)
- [x] T012 #12 The phase column takes the rail's colours: clarify yellow, plan blue, implement peach (P2)
- [ ] T013 #13 A bar at 100% draws green; a bar under way keeps the bar colour (P3)
- [x] T014 #14 A spec's warnings sit under its own row, indented, instead of together at the end (P1)
- [ ] T015 #15 Worktree rows line up with feature rows: same id, name and phase columns (P2)
- [ ] T016 #16 The `↗` link only on the active row and the row under the pointer, so the column is quieter (P3)

### Tasks tab

- [x] T017 #17 A header row names the feature, its phase and its count (`026 claude-context · implement · 9/20`) (P1)
- [x] T018 #18 Each story heading carries its own count (`Phase 3: User Story 1 · 2/5`) (P1)
- [x] T019 #19 The last turn's diff shows at most 6 lines, with `+N lines` (P2)
- [ ] T020 #20 The current task row is bold, with `⏱` aligned at the right edge (P3)
- [x] T021 #21 The `⇉ … can run in parallel` line drops when the brackets already show the run (P1)
- [ ] T022 #22 Task ids padded to one width (`T9 ` and `T10`) so the text column lines up (P2)
- [x] T023 #23 The fold row counts what it folds (`✓ 9 done · T001…T009`) (P1)

### Session tab

- [x] T024 #24 Rows grouped under Project, Governor, Activity and Updates headings (P1)
- [x] T025 #25 The governor's state row takes the band's colour: green ok, yellow throttle and hold, red stop and ceiling (P1)
- [ ] T026 #26 Each queued subagent has a run button beside `/astrolabe run`, pressable only from the keyboard (P2)
- [ ] T027 #27 The review heading names the model and its age (`review 002 · opus · 5m ago`) (P2)
- [ ] T028 #28 Long values wrap under their value column instead of being cut (P2)
- [ ] T029 #29 Every time reads the same way: clock and distance (`14:00, in 2h13m`) (P3)

### Dashboard

- [x] T030 #30 KPI chips take the footer's ramp: context and burn green, yellow, red (P1)
- [ ] T031 #31 One blank row between Dashboard sections, and every section titled the same way (P2)
- [ ] T032 #32 From 100 columns the KPI rows sit in two columns (P3)
- [ ] T033 #33 The chart's axis says `%` and its first and last times (P2)
- [ ] T034 #34 The dial names the current step under it (P2)
- [x] T035 #35 Before the first reading the chart's place says what brings one (`send a prompt; the reading comes after the turn`) (P1)

### Help, Config, PRs

- [ ] T036 #36 Help in titled blocks (Commands, Keys, Options, Marks, Steps, Models) the filter can jump between (P2)
- [ ] T037 #37 Each command in Help copies itself on press (P3)
- [ ] T038 #38 Config rows show the default and the description of the option under the pointer (P2)
- [ ] T039 #39 Config marks a value changed from its default with `•` (P2)
- [ ] T040 #40 PR rows show the age and the author next to the checks (P3)
- [x] T041 #41 A PR action waiting for its second press says so on the row (`press again to merge #42`) and clears after 10 s (P1)
- [ ] T042 #42 `/astrolabe doctor`'s checks also as a Health block in the Help tab (P3)

### Band, footer, toasts, access

- [ ] T043 #43 The band's `+N` names the other features in progress on hover (P2)
- [ ] T044 #44 Every toast starts with `🧭`, stays under 120 characters, and says where the rest is (P2)
- [ ] T045 #45 A footer chip cut to fit shows its whole text on hover (P3)
- [ ] T046 #46 For the first three sessions the footer ends with a `/astrolabe help` chip (P3)
- [x] T047 #47 The accessible mode spells every mark (`priority high`, `blocked`, `parallel`) (P1)
- [x] T048 #48 Muted and dim rows meet 4.5:1 contrast on the light flavor (latte) (P1)
- [x] T049 #49 The ascii icon set also covers the pane's own marks: `⇉ ┌ │ └ ↗ ✕ ⏱ ⟳ ↑ ↓` (P1)
- [ ] T050 #50 `h` opens the Help tab from any tab, and the legend says so (P2)
