# Contract: the status entry

`formatStatus(state, columns?)` in `hooks/core/status-text.ts` returns the text that
`hooks/surfaces/status.ts` passes to `$.ui.status`.

| State | Text |
|---|---|
| Spec Kit not present | `◆ no Spec Kit` |
| Present, no active feature | `◆ no active feature · next: <nextCommand>` |
| Active feature with tasks (`total > 0`) | `◆ <id> · <phase> <percent>%` |
| Active feature without tasks | `◆ <id> · <phase>` |
| Active feature guessed (`activeWarning` set) | `~` before the id: `◆ ~002 · implement 45%` |
| A skill is running for a step | ` · <step>…` appended: `◆ 002 · plan · plan…` |

`percent` is `Math.floor(done * 100 / total)`; 9 of 20 is `45`. Abandoned features never
show here, because they are never active by fallback; an abandoned feature named by
`feature.json` shows as `◆ 003 · abandoned`.

## Width degradation (FR-024)

With a `columns` budget, segments are dropped in this order until the text fits:

1. the running-skill suffix,
2. the `next:` part (the text becomes `◆ no active feature`),
3. the percentage,
4. the phase,
5. everything after `◆ ` except the id (`◆ 002`),
6. the whole entry (empty string) when even `◆ <id>` does not fit.

An id is never cut. Without a budget the full text is returned.
