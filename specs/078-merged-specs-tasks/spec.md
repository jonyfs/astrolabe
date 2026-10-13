---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: One Specs and Tasks tab, and 100 pane improvements

**Feature Branch**: `078-merged-specs-tasks`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Merge the Specs and Tasks tabs, since tasks are items of a spec; the layout is confusing. Suggest 100 improvements for the whole Astrolabe pane so every tab is better organized, more functional and easier to use." Then: "Create the spec and apply all the suggestions." The suggestions are the published page `astrolabe-100` (nine areas A to I, 100 numbered changes, priorities P1 to P3).

## Reading the result

Each change has a number (1 to 100, in the order of the page). The result of each is recorded in `tasks.md`:

| Mark | Meaning |
|---|---|
| Done | Built and covered by a test |
| Partial | Built in the part the engine allows; the rest is named |
| Engine | The engine does not offer what the change needs (named in the row); a text fallback is drawn where one exists |
| Decision | Two changes contradict each other; the choice and the reason are written |

## User scenarios

### US1: One tab for a spec and its work (P1)

A person opens the pane and sees one list. The active spec is open: its stories and its open tasks sit under its row, indented. Other specs are one row each. They never switch tabs to see what a spec contains.

**Acceptance**
1. The tab row has four tabs: Specs, Session, PRs, Setup.
2. An open spec shows its stories and tasks at column 2 and 4. A folded spec shows one row.
3. `t` shows only the tasks of the active spec, with the pane's full height.
4. A filter that matches a task keeps the spec row visible above it.
5. A stored `tasks` tab opens Specs.

### US2: Move through the tree without a mouse (P1)

**Acceptance**
1. Enter on the selected spec opens or folds it. Making a spec the active one has its own key.
2. Fold state is kept per project.
3. One key opens or folds every spec.
4. Esc clears the filter first, then closes the help overlay, then closes the pane.

### US3: Every other tab reads the same way (P2)

Session, PRs and Setup follow the same glyphs, columns and key legend as Specs. A tab names at most six keys.

## Requirements

Requirements are grouped by the areas of the page. The number in brackets is the change number.

### A. Specs and tasks in one tab (1 to 16)

- **FR-001** (1) `TABS` has four entries: `specs`, `session`, `prs`, `setup`, with hotkeys `1` to `4`. `PaneTab` loses `tasks`; `legacyTab('tasks')` is `specs`.
- **FR-002** (2, 4) The Specs tab is a tree: a spec row at column 0, a story row at column 2, a task row at column 4. No group header sits between them.
- **FR-003** (3) The active spec starts open; every other spec starts folded. A fold state the person set wins.
- **FR-004** (5) Enter on the selected spec toggles its fold. The two-step "make active" moves to `u`.
- **FR-005** (6) `t` toggles tasks only: other specs are hidden and the active spec's open tasks take the body.
- **FR-006** (8) The spec row carries `done/total`, the percentage and the estimate; the tasks list has no second header.
- **FR-007** (9) One filter matches specs and tasks. A task match keeps its spec visible; a spec match shows its tasks folded.
- **FR-008** (10) `x` on a selected task puts its tick in the prompt box for Claude (Astrolabe writes nothing to the project, spec 051). The row shows `✓` only after tasks.md changes.
- **FR-009** (11) `e` opens every spec; pressed again it folds every spec but the active one.
- **FR-010** (12) The open specs are stored per project and restored on the next session.
- **FR-011** (13) Done tasks fold per story into one line: `✓ 5 done · T001…T005 · 52m`.
- **FR-012** (14) The current task is pinned first in its spec: `▶`, its files, the command that runs it.
- **FR-013** (15) The band's task opens the pane with the task selected.
- **FR-014** (16) The Specs badge shows in-progress specs and open tasks as `2·11`; no Tasks badge.

### B. Navigation and keys (17 to 26)

- **FR-015** (17) Each tab's legend names at most six keys, in the order people use them.
- **FR-016** (18) Help is an overlay: Esc returns to the tab and does not close the pane.
- **FR-017** (19) `g` and `G`, PageUp and PageDown scroll to the ends.
- **FR-018** (20) Esc is layered: filter, then overlay, then pane.
- **FR-019** (21) Digits follow tab order at every width; they show only while the pane has focus.
- **FR-020** (22) While keys go to the pane, an accent bar sits at the left edge of the tab row.
- **FR-021** (23) Scroll and selection are remembered per tab and per project.
- **FR-022** (24) Tab and Shift+Tab cycle the tabs.
- **FR-023** (25) A spec id or task id copies on press; the toast names what was copied.
- **FR-024** (26) The title carries a breadcrumb that follows the selected row.

### C. Spec rows (27 to 38)

- **FR-025** (27) One form: mark, id, name, phase, bar, count; the age is in the detail line.
- **FR-026** (28) The phase chip uses the colour of the band's step chip.
- **FR-027** (29) A group header carries its name, count and a small stacked bar of its states.
- **FR-028** (30) Columns are fixed: id 4, name 24, phase 9, bar 9, count 6.
- **FR-029** (31) The worktree is a chip `⎇ name` at the end of the row.
- **FR-030** (32) The spec whose branch has a pull request carries `PR #n ✓`.
- **FR-031** (33) Gate dots `●●●○○` replace the gates line.
- **FR-032** (34) Open questions are a chip `? n`; opened, they list under the spec.
- **FR-033** (35) The legend names the order: `o order: progress`.
- **FR-034** (36) Filter presets cycle Mine, Blocked, Ready to close, All.
- **FR-035** (37) Roadmap items are dim rows with a `+ specify` action.
- **FR-036** (38) Empty states teach: no Spec Kit shows the init command with a copy button; no features shows `/speckit-specify`.

### D. Task rows (39 to 50)

- **FR-037** (39) The current task is a block: elapsed time, the files it names and the test that covers it.
- **FR-038** (40) A `[P]` run carries one `⇉ run these n` action under the run.
- **FR-039** (41) A task that waits says why: `⏸ after T012`.
- **FR-040** (42) A test task and the task it covers are marked as a pair.
- **FR-041** (43) Each story carries a bar: `US2 ▰▱ 0/2`.
- **FR-042** (44) Paths a task names are separate links.
- **FR-043** (45) A done task shows what it took; an open one shows the estimate from the pace.
- **FR-044** (46) Checklist items appear as the last story.
- **FR-045** (47) `[NEEDS CLARIFICATION]` lines are a first story, each with an ask-Claude action.
- **FR-046** (48) A long task wraps to two lines at 100 columns and more.
- **FR-047** (49) A key pages down.
- **FR-048** (50) The selected task offers: copy id, open file, ask Claude.

### E. Session (51 to 62)

- **FR-049** (51) A Now block: the deciding window, the next level and what the governor is doing.
- **FR-050** (52) The project is a two-line header.
- **FR-051** (53) Every window bar carries ticks at 60, 80 and 88.
- **FR-052** (54) A sparkline of cost and tokens marks the turn that spent most.
- **FR-053** (55) Live agents use the live table's columns.
- **FR-054** (56) Updates fold behind `⬆ n updates [ review ]`.
- **FR-055** (57) KPIs are a table with a copy-as-Markdown button.
- **FR-056** (58) A timeline of turns names the spec and task each touched.
- **FR-057** (59) Findings are a list with open and ask-Claude actions.
- **FR-058** (60) Health lists `✓` and `✖` rows, each with the command that fixes it.
- **FR-059** (61) The governor log folds and starts closed.
- **FR-060** (62) The context bar marks where the window will compact.

### F. Pull requests (63 to 72)

- **FR-061** (63) A table: number, title, checks, review, age, actions, aligned like the live table.
- **FR-062** (64) Checks are cells, each a link to its run.
- **FR-063** (65) A chip names the spec of the branch and jumps to it.
- **FR-064** (66) Approve, update and merge confirm on the row.
- **FR-065** (67) Draft and labels are small chips, dim for drafts.
- **FR-066** (68) Pull requests that need the person sort first.
- **FR-067** (69) A branch with no pull request offers an open-PR suggestion.
- **FR-068** (70) A release row: the latest tag and the commits not released.
- **FR-069** (71) Queue order when GitHub has a merge queue.
- **FR-070** (72) Filter tokens `is:mine`, `is:failing`, `is:draft`.

### G. Setup (73 to 84)

- **FR-071** (73) Option groups fold; the group with a change is open.
- **FR-072** (74) Every choice option is a `‹ value ›` picker with its other choices beside it.
- **FR-073** (75) A bar at the bottom keeps Save, Reset and Cancel in view.
- **FR-074** (76) `/` finds options by name and by description.
- **FR-075** (77) Presets Minimal, Balanced, Full set the look options.
- **FR-076** (78) A preview of the band and footer follows the draft.
- **FR-077** (79) `r` on an option returns it to its default.
- **FR-078** (80) The option card ends with a link to its README section.
- **FR-079** (81) The model and effort of a skill change in its row.
- **FR-080** (82) The accessible mode shows its effect at once.
- **FR-081** (83) A button copies the changed options as JSON.
- **FR-082** (84) Conflicting options are named on the row.

### H. Band, status and footer (85 to 94)

- **FR-083** (85) The band's id opens the spec, a step opens its file, the task opens the pane at the task.
- **FR-084** (86) One attention slot: blocked, paused or a question.
- **FR-085** (87) The status entry shows two facts.
- **FR-086** (88) The footer has a fixed height of three lines.
- **FR-087** (89) The footer palette follows the Astrolabe flavor.
- **FR-088** (90) An idle band is `◆ 002`.
- **FR-089** (91) One toast at a time; the history is in Session.
- **FR-090** (92) The spinner names the task and its elapsed time.
- **FR-091** (93) The hint is not repeated.
- **FR-092** (94) Under 100 columns the pane opens as a bottom drawer.

### I. Visual system (95 to 100)

- **FR-093** (95) One glyph per meaning: `◆` active, `✓` done, `·` open, `✖` abandoned, `▲` attention; written in the help overlay.
- **FR-094** (96) Two text colours and one accent; the accent marks selection and actions only.
- **FR-095** (97) An 8-cell grid: every list aligns to the same column positions in every tab.
- **FR-096** (98) A density option: comfortable or compact changes padding, not content.
- **FR-097** (99) The light flavor's faint text and bar remainders pass a contrast check.
- **FR-098** (100) No motion except the running ellipsis.

## Decisions

1. **Key 2.** Change 7 (key 2 stays as the tasks alias) contradicts change 21 (digits follow tab order). Digits follow tab order: `1` Specs, `2` Session, `3` PRs, `4` Setup. `t` is the tasks key. Change 7 is not applied.
2. **Writing ticks.** Change 10 puts the tick in the prompt box. Astrolabe writes nothing to the project (spec 051); the existing in-pane write from spec 045 is removed.
3. **Engine keys.** A Button hotkey is one digit or one lowercase letter. Arrow keys reach the mod only as `ui.scroll`. Changes that name `→`, `←`, `[`, `]`, space, `G`, PageUp, PageDown, Tab and Shift+Tab are built on letters and recorded as Partial or Engine.

## Success criteria

- **SC-001** The pane has four tabs at 60, 80 and 100 columns and no `Tasks` tab.
- **SC-002** Opening the pane on a project with an active spec shows that spec's open tasks without a key press.
- **SC-003** `npx tsc --noEmit`, `npm test` and `claude plugin validate .` pass.
- **SC-004** Every row of the result table in `tasks.md` has a mark and, unless Done, a reason.

## Out of scope

- A new store or a write path to the project's files.
- Changes to the statusline vendored copy.
