---
track: quick
status: active
---
# Quick spec: Design review and statusline parity (umbrella)

**Created**: 2026-10-12 · **Source**: the owner asked for an advisor review of the proposed redesign (band, status, pane, tabs, scale to 100+ specs, live table) and for the features jonyfs/statusline has that Astrolabe lacks. Fifty improvements, grouped by area.

This spec tracks the fifty improvements. Each one is implemented by exactly one child spec, named at the end of its task line. A task here is ticked when its child spec's task that carries the same `#n` is ticked. P1 first.

## Design reference

- Claude Design canvas "Astrolabe — redesign", boards 1–9: https://claude.ai/code/artifact/65ee4724-d195-4e86-83e2-a438c2757e04
- One-page viewer of the same boards (anchors `#b1` … `#b9`): https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL
- Static copy in the repository: `docs/design/astrolabe-redesign.html`

| Board | Anchor | Content | Child spec |
|---|---|---|---|
| 1 Prompt chrome at 180 columns | `#b1` | band, spinner, prompt hint, status entry | 065 |
| 2 Responsive by width | `#b2` | band and status at 200, 144, 100, 80 | 065 |
| 3 Pane: Specs and Tasks | `#b3` | tab row, legend row, spec block, tasks by story | 066 |
| 4 Pane: Session and Setup | `#b4` | usage, governor box, KPIs, Config + Models | 066 |
| 5 Tabs, toasts and questions | `#b5` | five tabs at three widths, toasts, `$.ui.ask` | 066 |
| 6 Specs at scale | `#b6` | focus view, blocks of 50, checks, jump | 067 |
| 7 statusline → Astrolabe | `#b7` | gap table, three-line footer | 068 |
| 8 Live table | `#b8` | agents, gates, cache, limits in eight columns | 069 |
| 9 Review | `#b9` | the fifty improvements | 063 (this spec) |

Constraints that hold for every task: colours only from `theme.ts` (IX), nothing slow on the draw path (XII), `next(e)` kept in AbovePrompt (VII), sized from columns with ids never cut (VIII), honest degradation (XI), English strings with i18n copies (I), nothing written to the project or to settings (III), test first (VI), README and images updated in the same pull request (II, gate 4).

## Tasks

### A. Consistency and tokens → 064-design-tokens

- [ ] T001 #1 One usage ramp: governor levels 60/80/88 colour every window; marks `▵` from 60 and `▴` from 80 (P1) → 064
- [ ] T002 #2 A text-grade muted role (`faint`, overlay2); overlay0 kept for rules and glyphs (P1) → 064
- [ ] T003 #3 Narrow glyphs only: `‖` `◷` `▲` in place of `⏸` `⏱` `⚠` (P1) → 064
- [ ] T004 #4 Task ids always four characters (`T011`), feature ids padded to the widest id (P1) → 064
- [ ] T005 #5 One duration format (`4m12s`, `2h09m`); under a day count down, beyond a day name the weekday (P2) → 064
- [ ] T006 #6 One phase abbreviation table (spec, clar, plan, tasks, impl) (P2) → 064
- [ ] T007 #7 One verb per key: `r` refresh, `q` run queued, `?` help with `h` alias (P2) → 064
- [ ] T008 #8 One message prefix, `astrolabe ✓ …` (P2) → 064
- [ ] T009 #9 Separators by level: `│` between zones, `·` inside one (P2) → 064
- [ ] T010 #10 Captures in latte, frappe, macchiato and colorblind; latte peach darkened for text (P3) → 064

### B. Band, status and prompt → 065-band-and-status

- [ ] T011 #11 Quick-track rail: spec → tasks → impl (P1) → 065
- [ ] T012 #12 The current step is a chip holding `9/20` (P1) → 065
- [ ] T013 #13 Paused state takes the band with a lift button (P1) → 065
- [ ] T014 #14 The next command in one place (P1) → 065
- [ ] T015 #15 With `footerIn=pane` the status entry is the lead only (P2) → 065
- [ ] T016 #16 No repeats between spinner, live table and band (P2) → 065
- [ ] T017 #17 Band chips are links (P2) → 065
- [ ] T018 #18 Brighten the step chip instead of a second toast in compact (P2) → 065
- [ ] T019 #19 One `⬆ N` update button (P3) → 065
- [ ] T020 #20 Idle band keeps the deciding window (P3) → 065

### C. Pane and navigation → 066-pane-five-tabs

- [ ] T021 #21 Five tabs; Help as a `?` overlay (P1) → 066
- [ ] T022 #22 Tab row holds tabs only; legend row holds keys (P1) → 066
- [ ] T023 #23 Badges count what needs the person (P1) → 066
- [ ] T024 #24 The selected spec renders as a block (P1) → 066
- [ ] T025 #25 Fixed section order (P2) → 066
- [ ] T026 #26 Empty states that teach (P2) → 066
- [ ] T027 #27 Setup marks non-default values (P2) → 066
- [ ] T028 #28 PRs tab as a table (P2) → 066
- [ ] T029 #29 Help overlay (P3) → 066
- [ ] T030 #30 The pane title says why a spec is active (P3) → 066

### D. Data honesty and scale → 067-specs-at-scale

- [ ] T031 #31 Focus view, blocks of 50, `#` jump (P1) → 067
- [ ] T032 #32 Ready to close (P1) → 067
- [ ] T033 #33 A checks row (P1) → 067
- [ ] T034 #34 Duplicate ids kept and marked (P1) → 067
- [ ] T035 #35 Scroll thumb and `rows a–b of n` (P2) → 067
- [ ] T036 #36 Placeholder rows for deferred specs (P2) → 067
- [ ] T037 #37 Unknown prints `?` (P2) → 067
- [ ] T038 #38 `full` at 100% (P2) → 067
- [ ] T039 #39 Group key `g` (P3) → 067
- [ ] T040 #40 "Touched this session" section (P3) → 067

### E. statusline parity and live table → 068-footer-statusline-parity, 069-live-table

- [ ] T041 #41 Footer line 1 git parity (P1) → 068
- [ ] T042 #42 Prompt cache chip (P1) → 068
- [ ] T043 #43 One live table for agents, gates, cache and limits (P1) → 069
- [ ] T044 #44 Git gate rows from the process list on `$.clock` (P2) → 069
- [ ] T045 #45 Skills as one chip (P2) → 068
- [ ] T046 #46 Todo progress on line 2 (P2) → 068
- [ ] T047 #47 Spend limit and `fast` on line 3 (P2) → 068
- [ ] T048 #48 Projection only when it lands before the reset (P2) → 068
- [ ] T049 #49 Brighten on change for branch, PR, skills, model (P3) → 068
- [ ] T050 #50 Hover row that explains a chip (P3) → 068

## Out of scope

- Copilot CLI, Codex and OpenCode harnesses, and installing into `settings.json` (Principle III).
- The nord and gruvbox flavors need their own spec (Principle IX names the four Catppuccin flavors).
