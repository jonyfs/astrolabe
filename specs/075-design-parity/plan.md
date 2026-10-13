# Implementation Plan: Design Parity, Second Pass

**Branch**: `075-design-parity` | **Spec**: `specs/075-design-parity/spec.md`

## Approach

Every change is a pure function in `hooks/core` with a test, a thin draw change in
`hooks/surfaces`, and a line of wiring in `hooks/register.tsx`. No new `$` call on the draw path.

| Area | Where | Change |
|---|---|---|
| Band bar, percentage tier | `hooks/core/band.ts` | `━` filled `barFill`, `━` empty `barEmpty`; percentage only from 200 columns |
| PR chip | `bandPr` in `band.ts`, `BandEdge.pr` in `surfaces/band.tsx` | read from `stats.git.pr`; width counted in `edgeWidth` |
| Update tiers | `bandUpdateLabel` in `core/updates.ts`, `plain` on the 80-column button | |
| Tabs | `surfaces/pane.tsx` | primary button for the tab shown, `▸` only for colorblind; help at the right edge |
| Specs rows | `featureRow`, `markOf`, `trackTag` in `core/pane.ts`; `specDetail` in `core/spec-actions.ts` | nine-cell `▰▱`, no age on the row, marks, track tag, `Name N` headings |
| Selected block | `rowDetail`, `rowDescription` in `register.tsx`, `surfaces/pane.tsx` | detail line, summary line, buttons |
| Tasks | `taskRows` in `core/pane.ts` | `○`, `▶` block, `test` tag, no group headers, edge text stops short of the link |
| Task actions | `taskActions` in `register.tsx` | `[P]` dispatch and issues button under the list |
| Session | `sessionChips` in `core/session-usage.ts`, `sessionRows` | chips row, one constitution row, findings count |
| Setup | `configBody` in `register.tsx` | `‹ value ›`, `(nerd here)`, `/` find |
| Checks | `reconcile` action kind, `reconcileSuggestion` | button under each check row |

## Removed

The breadcrumb, the summary block and its toggle above the Specs list. The summary's first line
and the file links remain on the selected row.

## Verification

- `claude plugin test .`, `npx -y -p typescript@5 tsc -p .`, `claude plugin validate .`
- Snapshots regenerated with `env -u TZ npx tsx scripts/update-snapshots.ts`
- Live captures of the checkout with `scripts/capture/scene.sh` (`CLAUDE_CMD='claude --plugin-dir .'`)
