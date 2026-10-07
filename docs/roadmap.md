# Roadmap

The owner picked these improvements on 2026-10-07 from a list of 60 (numbers are that list's).
Number 28, a sound when the governor pauses, was left out. Each group below becomes one spec,
built in this order, through the Spec Kit flow.

| Spec | Theme | Items |
|---|---|---|
| 018 | Footer, icons and the Dashboard | #1 Raster charts, #2 Svg charts, #3 astrolabe dial, #4 Nerd Font icons, #33 footer in place of the statusline, #34 branch with ahead, behind and changed |
| 019 | Languages | #46 the interface in the person's language, with dictionaries for English, Spanish, French and Brazilian Portuguese |
| 020 | Spec Kit workflow | #13 next-command button, #14 next command suggested in the prompt, #15 checklist status, #16 `[NEEDS CLARIFICATION]` list, #19 `[P]` tasks suggested as subagents, #20 feature-done toast, #21 several Spec Kit roots, #22 Spec Kit extensions, #24 a task ticked with no test changed, #40 `/astrolabe next`, #45 copy the next command |
| 021 | Time and history | #17 time per task, #18 feature finish estimate, #23 features per week, #30 governor history, #44 tasks done next to the turn's duration |
| 022 | Usage and cost | #25 usage sparkline in the band, #26 session cost budget, #27 context warning before autocompact, #29 per-model windows, #31 phone notice on resume, #32 projection to the reset in words, #38 prompt cache about to go cold |
| 023 | More git in the footer | #35 pull request and CI (opt-in), #36 worktree, #37 stash count |
| 024 | Richer pane and band | #5 charts as real images, #6 an animated `Client` panel, #7 spec summary as Markdown, #8 the turn's `tasks.md` diff, #9 links to the feature's files, #10 hover cards on the band, #11 theme follows light and dark, #12 compact band when narrow, #49 feature filter |
| 025 | Commands and keys | #39 `/astrolabe help`, #41 a keyboard shortcut for the pane, #42 rich `/astrolabe status`, #43 the Edit row names the ticked task, #47 first-run tour, #48 text-only accessible mode |
| 026 | Context for Claude | #50 the active feature in Claude's context, #51 a constitution reminder, #52 a short context on resume, #53 a session summary from a small model, #54 a quick question about the feature |
| 027 | Quality and distribution | #55 a performance benchmark in CI, #56 README images built in CI, #57 Desktop app captures, #58 a privacy page, #59 art and texts for the plugin directory, #60 a 500-feature load test |

Added by the owner on 2026-10-07, after the list:

| Spec | Theme | What it does |
|---|---|---|
| 028 | Config tab | A pane tab with an editable form of every option and a Save button that applies them through `$.config.set`; the mod reloads with the new values. |
| 029 | Humanize option | An option that adds a short, revised version of the humanizer rules to Claude's system prompt (`prompt.compose`), so everything Claude writes in the project follows them. |
| 030 | Model and effort per skill | A table of the best model and effort for each gstack and Spec Kit skill, shown in a tab; in `auto` mode a `turn.step` hook sends the request with that model and effort while the skill runs. |
| 031 | Terse mode | An option that adds a terse-answer section to the system prompt (levels `lite` and `full`), so Claude writes only what is needed. |
