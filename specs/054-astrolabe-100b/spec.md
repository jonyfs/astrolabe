---
track: quick # quick | full
status: active # active | done | abandoned
---

# Quick spec: 100 more improvements

**Created**: 2026-10-08 · **Source**: the owner asked for 100 improvements to make Astrolabe
faster, more efficient and reliable, with information organized correctly, useful KPIs, the
statusline, worktrees, gates, interface, colours and useful links, and for features that help
use Claude better. The owner also asked for a status filter on Specs and a reset for the
configuration. Each item repeats no open task of specs 041 to 053.

Tasks run P1 first. Each becomes failing tests, then code, then a release.

## Tasks

### Speed and efficiency

- [ ] T001 #1 One `$.state` read per render: the Pane handler reads SPECKIT, SESSION, USAGE and PANE once and passes them down (P1)
- [ ] T002 #2 The help text built once per language and option set, not on every render (P2)
- [ ] T003 #3 `specsRows` for an unchanged state and width memoized by memo version (P2)
- [ ] T004 #4 The worktree refresh skips worktrees whose HEAD did not move since the last read (P2)
- [x] T005 #5 `reconcileNow` after a Bash command only when the command can touch specs, `.specify` or the branch (`git`, `mv`, `cp`, `rm`, `mkdir`, `bash .specify/…`) (P1)
- [ ] T006 #6 The PR list cached for 60 s across tab switches (P2)
- [ ] T007 #7 The dial frames computed once per phase, not per render (P3)
- [ ] T008 #8 `flushStats` merges writes within one tool call into one state write (P2)
- [ ] T009 #9 The usage chart grid reused when the series and size did not change (P3)
- [ ] T010 #10 A load test for 1,000 tasks in one tasks.md: the Tasks tab under 30 ms (P2)

### Reliability

- [ ] T011 #11 Every timer callback wrapped so an error is logged once and never repeats on each tick (P1)
- [ ] T012 #12 A stale-state guard: a SPECKIT state older than its memo is redrawn from the memo (P2)
- [ ] T013 #13 A tasks.md over 2 MB is read once and summarized instead of re-read on each write (P2)
- [x] T014 #14 A `gh` that hangs is cut at 8 s everywhere it runs, with the PRs tab saying so (P1)
- [ ] T015 #15 `/astrolabe doctor` also checks the hook budget: the slowest hook of the session in ms (P2)
- [ ] T016 #16 A broken `.specify/extensions.yml` is named in the Session tab with its line (P2)
- [ ] T017 #17 A reload keeps the pane's scroll, filter and tab (state survives; module values rebuilt) (P2)
- [ ] T018 #18 The governor's queue survives a reload and says so (`3 waiting since 14:02`) (P2)
- [ ] T019 #19 A feature folder without spec.md shows as `?` with the reason, never as `specify` silently (P1)
- [ ] T020 #20 Two sessions on one project never toast the same phase move twice (P3)

### Information organized

- [x] T021 #21 The Specs tab filters by status: All, In progress, Next up, Done, Abandoned (`s` cycles; `is:done` in the filter) (P1)
- [ ] T022 #22 The Session tab in four blocks: Project, Governor, Activity, Updates (P1)
- [ ] T023 #23 The Dashboard's first screen holds only what changes decisions: tasks left, usage now, at the reset, context (P1)
- [ ] T024 #24 The footer's parts in a fixed order the Help tab lists, so nothing moves between turns (P2)
- [ ] T025 #25 Feature ids padded to the widest, names aligned in every tab that lists features (P2)
- [ ] T026 #26 Each tab says when it was last brought up to date (`updated 12s ago`) (P2)
- [ ] T027 #27 The Tasks tab groups by status: current, next, blocked by an earlier one, later (P3)
- [ ] T028 #28 The Help tab's commands sorted by how often they are used, with the common ones first (P3)
- [ ] T029 #29 Warnings ordered by severity: blocking, then stale, then advisory (P2)
- [ ] T030 #30 One place for the active feature: the pane title, the band and the footer all name it the same way (P2)

### KPIs

- [ ] T031 #31 Tasks per hour this session and this week (P1)
- [ ] T032 #32 Time from specify to done for each finished feature (P2)
- [ ] T033 #33 Turns per ticked task, to see when Claude spins (P1)
- [ ] T034 #34 Context used per ticked task (P2)
- [ ] T035 #35 Drift alarms per feature (P3)
- [ ] T036 #36 How long the session sat waiting on the governor (P2)
- [ ] T037 #37 Subagents run per feature and their share of the window (P3)
- [ ] T038 #38 Compactions this session, and the context each one freed (P2)
- [ ] T039 #39 The share of tasks ticked by subagents against the main thread (P3)
- [ ] T040 #40 A weekly trend line of tasks done over the last 8 weeks (P2)

### Statusline and footer

- [x] T041 #41 The footer on every tab, Config, PRs and Help included, with a test per tab (P1)
- [ ] T042 #42 The footer's model chip names the 1M context window when it is on (`opus 5.5 1M`) (P2)
- [x] T043 #43 A context chip that turns into `compact soon` past 85% (P1)
- [ ] T044 #44 The footer's git chip shows the PR number as a link when `pullRequest` is on (P2)
- [ ] T045 #45 A chip for the running skill with its model (`⟳ implement · sonnet`) (P2)
- [ ] T046 #46 The footer drops its separator row when the pane is under 12 rows (P3)
- [ ] T047 #47 The status entry under the prompt can show the full footer on one line at 140 columns and wider (P3)
- [ ] T048 #48 The footer chips' order and colours read from one table the Help tab prints (P3)

### Worktrees

- [ ] T049 #49 The Specs tab marks each feature that has a worktree, with its folder (P1)
- [ ] T050 #50 A worktree whose branch is merged shows `merged` and the command that removes it (P2)
- [ ] T051 #51 A worktree with uncommitted changes shows how many (P2)
- [ ] T052 #52 Two worktrees on one feature are flagged as a conflict (P1)
- [ ] T053 #53 `/astrolabe worktrees` lists them all as text (P2)
- [ ] T054 #54 The band names the worktree the session runs in when it is not the main one (P2)
- [ ] T055 #55 A worktree's tasks count toward its feature's progress in the main checkout (P2)

### Gates

- [ ] T056 #56 A gate row per feature: constitution, clarifications, checklist, analyze, tests, each ✓ or ✗ (P1)
- [ ] T057 #57 `/speckit-implement` refused while the feature has open clarifications, with the reason and an override command (P2)
- [x] T058 #58 A PR merge refused from the PRs tab while its checks are pending or failing (P1)
- [ ] T059 #59 The analyze gate turns green only after `/speckit-analyze` ran on the current tasks.md (P2)
- [ ] T060 #60 A release gate check in the PRs tab: version in plugin.json matches the tag about to be made (P3)
- [ ] T061 #61 Gates listed in the Help tab with what each one checks (P2)
- [ ] T062 #62 The governor's gate log in the Session tab: what was held, run or dropped, today (P2)

### Interface

- [x] T063 #63 Config reset: a `Reset to defaults` button on the Config tab, pressed twice, and `/astrolabe config reset` (P1)
- [ ] T064 #64 The Config tab groups options: Display, Governor, Claude, Integrations (P2)
- [ ] T065 #65 Number keys show on the tab labels (`1 Specs`) only while the pane has the keyboard (P3)
- [ ] T066 #66 A row selected with the arrows on Specs, with Enter opening its spec.md link (P2)
- [ ] T067 #67 Long names wrap on Desktop and cut with `…` in the terminal, consistently (P2)
- [ ] T068 #68 Toggling the pane with the same key that opened it (P3)
- [ ] T069 #69 A compact pane mode under 60 columns: one column, no bars (P2)
- [ ] T070 #70 Empty Dashboard sections hidden instead of drawn with zeros (P1)

### Colours

- [ ] T071 #71 One colour per phase, used the same in the rail, the Specs tab and the dial (P1)
- [ ] T072 #72 Warnings in peach, errors in red, success in green, everywhere, from the theme table (P1)
- [ ] T073 #73 The Claude Code theme's own keys used where they exist, so `dark-daltonized` and other themes read right (P1)
- [ ] T074 #74 Muted rows meet 4.5:1 in every flavor, checked by a test (P2)
- [ ] T075 #75 Chip text colour picked by contrast, not by flavor (P2)
- [ ] T076 #76 A `colorblind` palette using shape as well as colour for status (P2)

### Links

- [ ] T077 #77 Each feature row links its spec.md, plan.md and tasks.md (P1)
- [ ] T078 #78 A task id links to its line in tasks.md (`file://…#L42`) (P2)
- [ ] T079 #79 The branch links to its page on the remote (P2)
- [ ] T080 #80 The PRs tab links each check run (P2)
- [ ] T081 #81 The Help tab links the Spec Kit and gstack docs (P3)
- [ ] T082 #82 The update row links the release notes of the new version (P2)
- [ ] T083 #83 The constitution's principles link to their heading (P3)

### Helping Claude work better

- [ ] T084 #84 A context line for Claude names the current task and its acceptance line from the spec (P1)
- [ ] T085 #85 When a turn ends with no task ticked after 3 turns on the same one, a toast suggests `/compact` or splitting the task (P1)
- [ ] T086 #86 Before `/speckit-implement`, a nudge to run `/speckit-analyze` when it has not run (P1)
- [ ] T087 #87 The next command proposed in the prompt box carries the feature id (`/speckit-plan 054`) (P2)
- [ ] T088 #88 A `focus` mode: the context line tells Claude to touch only files the current task names (P2)
- [ ] T089 #89 [P] tasks offered as one prompt that dispatches them to subagents (P2)
- [ ] T090 #90 After a feature is done, a prompt suggestion for `/speckit-retro` or gstack `/retro` (P3)
- [ ] T091 #91 The prompt hint warns when the prompt names a feature other than the active one (P2)
- [ ] T092 #92 A summary of the last 5 turns of the feature available as `/astrolabe recap` (P2)
- [ ] T093 #93 A guard that tells Claude, through the context line, when tasks.md and the code drift apart (P2)
- [ ] T094 #94 Model choice per task kind: tests on Sonnet, design on Opus, through skillModels (P3)
- [ ] T095 #95 A cache-warm reminder only when the next step is likely within 5 minutes (P3)

### Ecosystem

- [ ] T096 #96 gstack `/ship` offered on the PRs tab for the active branch (P2)
- [ ] T097 #97 gstack `/review` offered when a PR is opened from the session (P2)
- [ ] T098 #98 Spec Kit's own version and the skills' version compared and named when they differ (P2)
- [ ] T099 #99 An export of the Dashboard numbers as Markdown for a PR body (P3)
- [x] T100 #100 Cost shown nowhere: the footer, the Dashboard, the chips and the budget toasts are gone, and so is the `costBudget` option (P1)
