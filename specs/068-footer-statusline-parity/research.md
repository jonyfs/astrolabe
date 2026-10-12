# Research: Footer and Statusline Parity

## R1 Where the prompt cache comes from

**Decision**: read the usage of each main-thread `turn.step` response (cache read and creation tokens) and keep the time and size of the last one. The cache lives five minutes, or an hour when the response created an hour entry.

**Rationale**: the engine hands a mod no prompt-cache payload. The usage of a response is the only fact about the cache a mod sees.

**Alternatives**: estimating from the idle time alone (no size, no reason) was rejected; a price is never shown.

## R2 The cold reason

**Decision**: the only reason is `model changed`: a response that read nothing right after the model changed. A plain expiry shows no reason.

**Rationale**: the other reasons statusline names are not in the usage a mod sees; an unknown reason prints nothing.

## R3 Persisting session facts

**Decision**: skills, todo, cache and directories are kept in the module's `live` object and merged by `flushStats`, like the tool counters.

**Rationale**: a tool call must not cost a state write. A reload loses at most one turn of these facts.

## R4 ASCII icon set

**Decision**: chips built from literal marks (`⌂ ⇐ ⇡ ⇣ ✖ ✓ ◷ ❖ ▸`) go through `asciiFold` when the ASCII set is chosen.

**Rationale**: "ascii wins everywhere" is an existing promise; the new chips must keep it.

## R5 Brighten on change

**Decision**: only the branch, PR, skills and model chips brighten, for 30 seconds, from a per-process map of last values.

**Rationale**: usage chips change every turn and would always be bright. The map is not written to `$.state` because the draw path never writes; a reload only forgets which chip changed last.

## R6 Hover row

**Decision**: each chip carries one sentence in `chip.explain.<name>`; the pane draws a hidden row per chip that shows while its chip is hovered. A chip that is a link carries the hover on its plain text parts.

**Rationale**: the pane's own hover scopes already work this way for cut chips (052 #45).
