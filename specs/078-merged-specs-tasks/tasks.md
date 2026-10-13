# Tasks: One Specs and Tasks tab, and 100 pane improvements

- [x] T001 `core/pane-tabs.ts`, `types/index.d.ts`: four tabs, one badge, six keys, `escapeStep` (FR-001, FR-014, FR-015, FR-018)
- [x] T002 `core/pane-tree.ts`: folds, `specChildren`, `withChildren`, `spaced`, suggestions, breadcrumb (FR-002 to FR-013)
- [x] T003 `core/pane.ts`, `core/pulls.ts`: fold glyph, PR chip, gate dots, section bars, `is:ready`, roadmap action, empty states (FR-025 to FR-036)
- [x] T004 `register.tsx`: the tree, the keys `t`, `e`, `x`, `u`, `m`, Esc layers, folds and selection kept (FR-004 to FR-010, FR-021)
- [x] T005 `surfaces/pane.tsx`, `surfaces/band.tsx`: key row, focus bar, task button, action kinds (FR-013, FR-020)
- [x] T006 Session: `core/session-usage.ts`, `core/live-table.ts`, `register.tsx` (FR-049 to FR-060)
- [x] T007 PRs: `register.tsx` table, filter, spec chip, open-PR suggestion (FR-061 to FR-070)
- [x] T008 Setup: `core/setup-extras.ts`, `core/skill-models.ts`, `register.tsx`, `paneDensity` (FR-071 to FR-082, FR-096)
- [x] T009 Four languages for every string; help text and marks (FR-093)
- [x] T010 Tests: `tests/core/pane-tree.test.ts`, `tests/integration/specs-tree.test.tsx`, the tab tests of 066 and 075
- [x] T011 README, CHANGELOG, version 0.138.0
- [x] T012 `claude plugin validate .`, `claude plugin test .`, CI, PR

## Result by change

Counts: 80 done, 13 partial, 5 engine, 1 not built, 1 decision.

| # | Change | Mark | Where or why |
|---|---|---|---|
| 1 | Four tabs | Done | `core/pane-tabs.ts` `TABS`, `PaneTab` |
| 2 | Specs as a tree | Done | `core/pane-tree.ts` `specChildren`, `withChildren` |
| 3 | The active spec opens itself | Done | `isOpen` |
| 4 | Indentation says ownership | Done | spec at 0, story and pinned task at 2, task at 4 |
| 5 | File-tree keys | Partial | Enter toggles. `→` and `←` reach the mod only as `ui.scroll` (rows), not as keys. |
| 6 | Tasks only on `t` | Done | `pane.tasksOnly` |
| 7 | Key 2 keeps working | Decision | Conflicts with 21; the digits follow the tab order. |
| 8 | One header for progress | Done | the count is on the spec row, the estimate in its detail line |
| 9 | One filter for both levels | Done | `filterFeatures` `taskDirs`, `specsTreeRows` |
| 10 | Tick from the pane | Done | `x` puts `tickSuggestion` in the prompt box |
| 11 | Fold all, unfold all | Partial | `e` toggles; `[` and `]` are not Button hotkeys. |
| 12 | Fold state is remembered | Done | `folds:<root>` in the store |
| 13 | Done tasks fold per story | Done | `✓ 5 done · T001…T005 · 52m` |
| 14 | Next task is pinned | Done | the current task leads its spec |
| 15 | The band opens the pane at the task | Done | `BandEdge.onTask`, `selectedTask` |
| 16 | One badge for the tab | Done | `badgesOf`, `2·11` |
| 17 | Six keys per legend | Done | `legendOf`; `c` and `m` appear only when they apply, `v` and `g` from 13 specs |
| 18 | Help is an overlay | Done | Esc drops it and keeps the pane |
| 19 | Go to top and bottom | Partial | `g` goes to the top where grouping is not offered. `G`, PageUp and PageDown are not keys a Button takes. |
| 20 | Esc is layered | Done | `escapeStep`, `ui.close` hook |
| 21 | Digits follow tab order | Done | `TABS` hotkeys 1 to 4 |
| 22 | Focus is visible | Done | `▌` before the tabs while the pane has the keys |
| 23 | Position is remembered | Done | scroll per tab (existing), selection per project |
| 24 | Tab and Shift+Tab | Engine | Not Button hotkeys. |
| 25 | Click the id to copy | Done | `⧉ id` on the selected spec and task |
| 26 | Breadcrumb | Done | drawn in the filter row; the title is set only when the pane opens |
| 27 | One row form | Done | spec 075 |
| 28 | Phase colour is the rail colour | Done | `PHASE_ROLE` (054 #71) |
| 29 | Group headers count | Done | `sectionBar` |
| 30 | Fixed columns | Done | id, name 24, phase 9, bar 9, count |
| 31 | Worktree chip | Done | `⎇ name` on the row and in the band |
| 32 | Pull request chip | Done | `pullsBySpec`, `PR #41 ✓` |
| 33 | Gate dots | Done | `gateDots` |
| 34 | Questions are a chip | Done | the chip, and the questions story under an open spec |
| 35 | The order is named | Done | `order: progress` |
| 36 | Filter presets | Partial | `m` cycles mine, blocked, ready, all; `f` is the filter key. |
| 37 | Roadmap items | Done | `+ specify` puts `/speckit-specify <item>` in the prompt box |
| 38 | Empty states teach | Done | a copy button with the command |
| 39 | The current task is a block | Done | elapsed time, files, covering test |
| 40 | Parallel runs are one action | Done | `run these` row under the run |
| 41 | Blocked tasks say why | Done | `‖ after T012`, from a named task or an open test task above |
| 42 | Tests sit with their code | Done | `test → T013` and `‖ after T012` |
| 43 | Stories carry a bar | Done | `US2 ▰▱▱▱▱ 0/2` |
| 44 | Files are chips | Done | each file is a link of its own in the terminal, text on desktop |
| 45 | Time per task | Done | done tasks fold with their time; open ones show `≈` from 100 columns |
| 46 | Checklists are a story | Partial | one row with the open count, linked to the checklists folder; items are not tickable |
| 47 | Questions come first | Done | |
| 48 | Wrap on wide panes | Done | from 100 columns and on desktop |
| 49 | Space pages down | Engine | Space is not a Button hotkey; `b` pages back, `j` forward. |
| 50 | A small action menu | Done | tick, ask Claude to do it, copy id; the file opens by `↗` |
| 51 | A Now block | Done | the governor box names the next level |
| 52 | Project is a header | Done | `projectHeader` |
| 53 | One scale for all bars | Done | ticks at 60, 80, 88 (066) |
| 54 | Cost per turn | Done | tokens per turn (cost is not shown by design, 054); the peak turn is named |
| 55 | Live agents use the live table | Done | `liveTextRows` |
| 56 | Updates fold | Done | `updates-fold` |
| 57 | KPIs as a table | Partial | copy as Markdown exists; no table widget |
| 58 | A timeline of turns | Done | a folded `turns` list: time, spec, task, tokens, the answer's first line |
| 59 | Findings are a list | Partial | ask Claude per finding; no open action |
| 60 | Health with fixes | Done | failed checks with their fix and a copy button |
| 61 | The governor log folds | Done | closed by default |
| 62 | Compaction on the context bar | Engine | the engine gives no compaction point |
| 63 | A real table | Done | |
| 64 | Checks are cells | Done | |
| 65 | Specs are linked | Done | `→ 002` jumps to the spec |
| 66 | Confirm on the row | Done | the button label asks |
| 67 | Draft and labels | Done | `[draft] [label]` chips |
| 68 | Needs-you sorts first | Done | |
| 69 | No PR yet | Done | open-PR suggestion |
| 70 | Release row | Done | `N commits since <tag>` beside the release gate |
| 71 | Queue order | Not built | `gh pr list` has no queue position |
| 72 | Filter tokens | Done | `is:failing`, `is:draft`, `is:approved`, `is:behind`, `is:mine` |
| 73 | Groups fold | Done | |
| 74 | Pickers are inline | Done | spec 075 |
| 75 | Save stays in view | Done | the bar sits above the options |
| 76 | Search reads descriptions | Done | |
| 77 | Presets | Done | Minimal, Balanced, Full |
| 78 | A live preview | Partial | the band as the drafted density draws it; the footer has no preview |
| 79 | Reset one option | Done | `↺ default` button; `r` refreshes the pane |
| 80 | The card links to the README | Done | terminal only |
| 81 | Models are editable in the table | Done | two buttons per skill, kept in the store |
| 82 | Accessible mode shows its effect | Done | words as soon as it is drafted |
| 83 | Copy settings | Done | |
| 84 | Conflicts are named | Done | `optionConflicts` |
| 85 | Band click targets | Done | id, steps, task |
| 86 | One attention slot | Partial | a blocked step takes the chip; paused and holding follow it |
| 87 | Status shows two facts | Done | 065 |
| 88 | The footer height is fixed | Partial | one or three rows by option; the reserve is computed |
| 89 | The footer follows the flavor | Done | `CLAUDE_STATUSLINE_FLAVOR` |
| 90 | Idle is a dot | Done | 042 #19 |
| 91 | One toast at a time | Engine | the engine keeps the stack |
| 92 | The spinner names the task | Done | |
| 93 | The hint is not repeated | Done | 065 #14 |
| 94 | Narrow terminals | Engine | the engine places the pane |
| 95 | One glyph per meaning | Done | the help overlay lists them |
| 96 | Two text colours and one accent | Partial | the theme roles; not audited row by row |
| 97 | An 8-cell grid | Partial | fixed in Specs; the other tabs keep their own |
| 98 | Density option | Done | `paneDensity` |
| 99 | Light flavor audit | Done | 064 #2 contrast tests cover latte |
| 100 | No motion but the ellipsis | Partial | the dial sweeps once on a step change; accessible mode removes it |
