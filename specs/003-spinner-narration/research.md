# Research: Spinner narrates the current task

- **Spinner props** (2.1.292 types): `word`, `message` (null unless a state overrides it),
  `suffix` (an ellipsis by default; "a rewrite is drawn as given"), `mode`. Raised on terminal
  and desktop. Decision: rewrite `suffix` only, so the engine keeps its word, elapsed time and
  tokens.
- **Width**: `e.viewport?.columns` when measured; the engine's own part (word, time, tokens)
  takes about 40 columns, so the suffix gets `columns - 40`, or 80 when no width is reported.
- **Turn scope**: `memo.runningSkill` and `memo.touched` are already cleared at every main
  `turn.complete` (feature 001), which bounds narration to the turn.
