---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Design Parity, Second Pass

**Feature Branch**: `075-design-parity`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Revisit everything in the design artifact, look at each of the nine boards and the improvement pages, see what is still missing and implement it." The artifact (version `1791818315-5f0a`) has the same nine boards as `docs/design/astrolabe-redesign.html`; the text of every board is identical.

**Method**: Each board was read against the code (`hooks/core/band.ts`, `pane.ts`, `pane-tabs.ts`, `session-usage.ts`, `spec-actions.ts`, `surfaces/pane.tsx`, `surfaces/band.tsx`) and against a live capture of the checkout (`claude --plugin-dir`, `docs/demo`, 180 columns). Specs 064 to 074 closed most of the 50 items; this spec lists what the captures still show differently.

## Reading the result

| Mark | Meaning |
|---|---|
| Done | Present on `main`; no work |
| Gap | Drawn on a board and not on `main`; a requirement below covers it |
| Engine | The engine draws it; the mod cannot change it |

## Board by board

### Board 1: prompt chrome at 180 columns

| Board shows | On main | Result |
|---|---|---|
| One band row: id chip, steps with `✓`, peach step chip holding `9/20`, bar, task | Same | Done |
| Bar drawn as `━━━━` in blue over a dim `━━━` remainder | `████░░░░` with a colour that follows the share left | Gap (FR-001) |
| Update as a button on the band row | Same | Done |
| `next(e)` rows of other mods under the band | Same | Done |
| Prompt suggestion `/speckit-implement` | `$.prompt.suggest` | Done |
| `PromptHint` tail `next: /speckit-implement · 11 left` | Tail carries the next command and the count | Done |
| Status entry holds only the feature and the deciding window | Same with `footerIn=pane` | Done |
| `⚠` before `astrolabe:` in the status entry | Drawn by the engine for a plugin entry | Engine |
| Spinner `✻ T011 · title · 4m 12s` | Same | Done |

### Board 2: widths 200, 144, 100, 80

| Board shows | On main | Result |
|---|---|---|
| 200: `PR #41 ✓` before the update button | No PR chip on the band (the PR sits in the user's hint row) | Gap (FR-002) |
| 144: bar 13 cells, no percentage | Percentage still drawn at 144 | Gap (FR-003) |
| 200 and 144: update label `⬆ gstack 1.91.33`, then `⬆ gstack`; 100: `⬆1`; 80: `⬆1` without brackets | `bandUpdateLabel` tiers exist; the 80-column form keeps the brackets | Gap (FR-004) |
| 100: `✓✓✓✓` marks, 9-cell bar, `▸ T011`; 80: id, marks, step, task | Same | Done |
| Blocked step `? clarify 2`; idle band keeps one dim row | Same | Done |

### Board 3: Specs and Tasks tabs

| Board shows | On main | Result |
|---|---|---|
| Title row `🧭 Astrolabe · 002 shopping-cart [ ✕ ]` | Title is the engine's | Engine |
| Tab row: active tab is a filled chip, the others plain, `? help` at the right edge | Every tab is a bracketed button and the active one adds `▸`; help lives in the key row | Gap (FR-005) |
| Key row: `/ filter  s in progress  o by progress ...` | Keys are the engine's plain-button form `f: filter` | Engine |
| Filter row `⌕ phase:implement has:questions▏  2/12 rows · c clear` | Filter row plus a second `· 3/3 rows` row | Gap (FR-006) |
| Spec detail block (breadcrumb, title, description, link) is not on the board | Drawn above the sections, pushing rows down | Gap (FR-006) |
| Section heading `In progress 2` (bold name, dim count) | `Active (1)`, `Next up (1)` with parentheses | Gap (FR-007) |
| Row `▸ ↑ 002 shopping-cart  implement ▰▰▰▰▱▱▱▱▱  9/20  45%` | `❯ ▸ ◐ 002 … implement ████░░░░░░ 9/20 45% updated 5m` | Gap (FR-007) |
| Block under the row: `11 left · ? 1 question · checklist 2 open · ⎇ wt-cart`, then buttons, then gstack buttons | Detail line, advisor row, gates row | Gap (FR-008) |
| Tasks: `002 shopping-cart · implement · 9/20 · ≈1h20 left` | Same | Done |
| Tasks: `⚠ open tasks pass the 5h reset (0h25)` | Absent | Gap (FR-009) |
| Tasks: current task as a highlighted block with files and `◷ 4m12s` | `current / next / later` group headers; `◷ …` when no start time | Gap (FR-010) |
| Tasks: `US2 Out of stock 0/2` story headers, `○` before each open task, `test` tag at the right edge, `┐┤┘ P` bracket | Story headers and bracket done; no `○`, no `test` tag | Gap (FR-011) |
| Tasks: `… 2 more · space`, `✓ 9 done · T001…T009 · 52m ▸` | `⇞ b`, `▼ n more (j)` arrows; fold row done | Done |
| Tasks: nothing between the list and the pinned footer | A `the active feature's open tasks · 1-5 tabs · ...` row | Gap (FR-012) |
| Footer pinned under every tab | Same | Done |

### Board 4: Session and Setup

| Board shows | On main | Result |
|---|---|---|
| `ctx ▰▰▰ 41% 82k/200k`, `5h` and `7d` bars with level marks and `pace` | Same (071) | Done |
| `7d · 24h` trend with projection; governor box with queue, `[ lift 1h ] [ revoke ]` | Same (071) | Done |
| Row `002  [ 9/20 tasks ] [ 8m/task ] [ 34 turns ] [ $4.10 ]` | Not drawn; the numbers sit in the Activity block | Gap (FR-013) |
| `constitution ✓ ratified · active by feature.json` | Two key/value rows far apart, `constitution` and `chosen by` | Gap (FR-014) |
| `review  6 findings (opus xhigh) [ open ]` | Findings appear only in the Specs detail | Gap (FR-015) |
| Setup groups Look, Usage governor, Claude, Model per skill | Same (074) | Done |
| Selected option shows `‹ compact ›  minimal · full` | Value only | Gap (FR-016) |
| `icons  auto  (nerd here)` | Value only | Gap (FR-016) |
| Key row `↑↓ move  enter change  / find option` | `enter` and arrows work; no find | Gap (FR-017) |

### Board 5: tabs, toasts, asks

| Board shows | On main | Result |
|---|---|---|
| Five tabs, badges that mean "needs you", `▲` only when the governor holds | Same (066) | Done |
| Below 80 columns: numbers and badges; below 60: `1 Specs  2·11  3▲` | Numbers and badges below 80 | Gap (FR-005) |
| Toasts `astrolabe ✓ / ▲ / ⬆ …`, one line each | Same (072) | Done |
| Governor question with `(applied)` | Same (072) | Done |

### Board 6: Specs at scale

| Board shows | On main | Result |
|---|---|---|
| Summary bar `64 specs ███ ▶6 · 3 early · 6 to close · ✓49` | Same (067) | Done |
| `⚠ 3 checks · 028 done with 1/30 ticked · ids 029 and 030 used twice` | Same (067) | Done |
| Rows `052 design-ux  impl  ▰▰▰▰▰▰▰▱  49/50` (8-cell bar, short phase, no percentage) | `████░░` bar, long phase, percentage | Gap (FR-007) |
| Row tail `quick · no tasks yet`, `full · plan.md ✓` | Not drawn | Gap (FR-018) |
| `◇ Ready to close 6 · all ticked, status: active ▸` with ids and `[ ⧉ ask Claude to close ]` | Same (073) | Done |
| `✓ Done 49 ▸   001–050 42   051–100 7` | Same | Done |
| Check row under its spec with `[ tasks.md ] [ ⧉ ask Claude to reconcile ]` | Text row only | Gap (FR-019) |
| Scroll thumb `┃` and `rows 21–42` | Same (067) | Done |
| `# 05▏ → 050 051 …` jump row | Same (067) | Done |

### Boards 7 and 8: statusline parity and the live table

Board 7 maps every statusline feature to a place. Spec 070 made the pane footer statusline's own output, so every row of that table that statusline draws is on screen; the native fallback keeps its chips. Board 8's table (eight columns, drop order, fixed widths, blank cells) is spec 069. Nothing to add; `tests/core/live-table.test.ts` and the captures `live-table-180` and `live-table-100` cover it.

### Board 9: the 50 improvements

Checked one by one against the code and the tests. Items 1 to 10 and 21 to 50 are present (`theme.ts`, `glyphs.ts`, `pane-tabs.ts`, `specs-scale.ts`, `governor.ts`, `usage-ramp.ts`). Items 11, 12, 13 and 17 to 20 are covered by the Board 1 and 2 rows above. Item 14 ("never both") is read as "no third place": the board 1 drawing shows the suggestion in the prompt and the count in the hint, and that is what the code does.

## Requirements

### Band

- **FR-001**: The band's bar MUST be drawn with `━` in `current-bar` blue for the filled part and the dim role for the rest, at 20 cells from 200 columns, 13 from 144, 9 from 100.
- **FR-002**: From 200 columns the band MUST show `PR #n` with its CI mark (`✓`, `✖`, `◷`) left of the update button when the branch has a pull request; the PR is read from state, never fetched on draw.
- **FR-003**: At 144 columns and below the percentage MUST NOT be drawn.
- **FR-004**: The update button MUST read `⬆ name version` from 200 columns, `⬆ name` from 144, `⬆N` from 100, and at 80 and below `⬆N` without brackets.

### Pane chrome

- **FR-005**: The tab shown MUST be a filled accent chip with its number and badge; the others MUST stay buttons with their hotkeys. `▸` stays only in the colorblind flavor and accessible mode. `help` sits at the right edge of the tab row, before the close button.
- **FR-006**: The Specs tab MUST draw one filter row (`⌕ query▏  n/m rows · c clear`). The spec detail block (breadcrumb, title, description, link) MUST NOT push the sections down: the selected row carries it (FR-008).
- **FR-007**: Section headings MUST read `Name N` (bold name, faint count). Rows MUST use the 9-cell `▰▱` bar from 80 columns of pane and 8 cells below, the short phase name, and `n/m` then `%`; the age (`updated 5m`) moves to the hover card.
- **FR-008**: The selected spec's block MUST be: the row; `n left · ? q question · checklist n open · ⎇ worktree`; the description in one dim line; the command buttons; the gstack skill buttons.

### Tasks

- **FR-009**: When open tasks are estimated to run past the next reset of the deciding window, the Tasks tab MUST show `⚠ open tasks pass the 5h reset (0h25)` under the header. Without an estimate (fewer than two samples) it MUST NOT show.
- **FR-010**: The current task MUST be a highlighted block (`▶ T011 title` at the left, `◷ 4m12s` at the right, the files it names under it); `current`, `next` and `later` headers MUST NOT draw. A task with no start time draws no clock instead of `…`.
- **FR-011**: Each open task MUST start with `○`; a task whose text begins with `Write … tests` or names a `tests/` path MUST carry a `test` tag at the right edge.
- **FR-012**: The row `the active feature's open tasks · 1-5 tabs · …` MUST NOT draw on the Tasks tab; the key row already names the keys.

### Session

- **FR-013**: The Session tab MUST show one row of chips for the active feature: tasks `n/m`, minutes per task, turns, cost; a chip with no data MUST be left out.
- **FR-014**: `constitution` and `active` MUST be one row: `constitution ✓ ratified · active by feature.json`; the two key/value rows they replace MUST NOT repeat it.
- **FR-015**: When a review of the active feature exists, one row MUST show `review  n findings (model effort)` with an `open` button that opens the review in the Specs tab detail.

### Setup

- **FR-016**: The selected option row MUST show its choices as `‹ value ›  other · other` and an `icons` row set to `auto` MUST add `(nerd here)` or `(unicode here)` after resolving the set in use.
- **FR-017**: Setup MUST offer `/` to find an option by name; matching rows stay, the group headings that have none are hidden.

### Specs rows and checks

- **FR-018**: A row MUST end with `quick · no tasks yet` for a quick spec without tasks, `quick` for a quick spec with tasks, and `full · plan.md ✓` once plan.md exists for a full spec.
- **FR-019**: A check row MUST carry buttons: `[ file ]` opening the file it names and `[ ⧉ ask Claude to reconcile ]`, which puts one prompt in the composer and never submits it.

### Shared

- **FR-020**: Every new string MUST exist in English, pt-BR, es and fr and fit the widths in the board.
- **FR-021**: Nothing slow on draw (Principle XII): every figure is read from state the session already holds.
- **FR-022**: The README, the captures in `docs/images` and the CHANGELOG MUST show the new forms.

## Out of scope (engine draws it)

- The `🧭 Astrolabe · …` title row and the `⚠` before the status entry.
- The key row's `f: filter` form: the engine draws a plain button with its hotkey as `key: label`.
- Brackets around the other tabs and around buttons.

## Success criteria

- **SC-001**: A capture of the checkout at 180 columns shows, for the band, a `━` bar, no percentage at 144 and the PR chip at 200.
- **SC-002**: A capture of the Tasks tab on `docs/demo` shows the highlighted current block, `○` marks, the story headers and no group headers.
- **SC-003**: `npm test` passes; each FR has a test that fails without it.
- **SC-004**: Zero new `$` calls on the draw path; `tests/core/budget.test.ts` still passes.

## Assumptions

- The user's reading of board 9 item 14 stands as written under Board 9.
- The `quick` and `plan.md ✓` tags and the 9-cell bar are accepted now; the earlier hold (spec 073) was an open question, and the design review has now asked for them.
