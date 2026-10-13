# Plan: One Specs and Tasks tab, and 100 pane improvements

## Approach

1. **Core first, pure.** `core/pane-tabs.ts` (tabs, badges, legends, title), `core/pane.ts` (`specTreeRows`, folds, filters), new `core/pane-tree.ts` for the tree helpers (fold state, breadcrumb, blocked-by, story bars). Tests in `tests/core/`.
2. **Surface.** `surfaces/pane.tsx` draws the tree rows, the focus bar, the key row. `$` stays in `register.tsx`.
3. **Wiring.** `register.tsx`: remove the `tasks` view, add fold/tasks-only state in `PaneState`, the `u`, `t`, `x`, `e` keys, the breadcrumb title.
4. **Other tabs** by area: Session (E), PRs (F), Setup (G), band/footer (H), visual system (I); each as a pure helper plus the smallest surface change.
5. **Docs.** README tab table and key list, CHANGELOG, help overlay, four languages.

## Risks

- `register.tsx` is one 4000-line file; changes land in small commits and CI runs per commit.
- Tests that press `tab-tasks` or expect five tabs change with the merge.
- Keys beyond a digit or lowercase letter do not exist for a Button; those changes are recorded as Partial or Engine.

## Verification

`npx tsc --noEmit`, `npm test`, `scripts/check-readme-sync.sh`, `claude plugin validate .`, captures at 80 and 144 columns with `scripts/capture/scene.sh`.
