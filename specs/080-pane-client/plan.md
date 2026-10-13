# Plan: The Specs body as a Client surface module

## Approach

1. **Probe (T001).** A throwaway test mounts a Client in the Pane under the test kit and sends it
   `ui.key` and `ui.pointer`, to confirm what reaches `onKey`, that `post` arrives as `ui.message`,
   and what a props change does to the kept state. Stop here if the kit shows a key does not arrive.
2. **Props.** `core/pane-client.ts` (pure): `clientProps(rows, window, tokens)` returns plain data
   under the limits; `windowOf` picks the rows. Tests in `tests/core/`.
3. **Module.** `surfaces/specs-client.tsx`: draws rows, owns selection and scroll, posts ops.
4. **Hooks.** `register.tsx`: `on('ui.message', { component: 'Pane' })` maps `{ op, key }` to the
   functions the Enter, scroll and button handlers already use; the Pane tree draws the Client in
   place of the Specs rows when `Client` is in the table and the props fit.
5. **Fallback.** One predicate `useClientBody(e, props)`; every path that is not true draws the
   0.138.1 rows. A mount error logs once and sets a flag so the pane stays on the fallback.

## Risks

- The engine has no way to give the Client the focus: the person clicks. Written into the help text.
- Duplicated row drawing (module and `paneTree`): rows are plain data, both read the same `PaneRow`.
- A render loop unmounts the instance: `setState` only from a key, pointer or props change.

## Verification

`npx tsc --noEmit`, `claude plugin validate .`, `claude plugin test .`, the Client tests in the kit.
