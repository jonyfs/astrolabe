# Contract: spinner suffix

`… <id> · <text> · <elapsed>`; without `<id> · ` for a task with no id.

| Elapsed | Shown |
|---|---|
| under 60 s | `45s` |
| under 60 min | `12m` |
| otherwise | `1h 5m` |

Budget: `columns - 40`, or 80 without a measured width. Only `<text>` is cut, ending in `…`.
If `… <id> · <elapsed>` alone exceeds the budget, nothing is rewritten.
