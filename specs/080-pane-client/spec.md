---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: The Specs body as a Client surface module

**Feature Branch**: `080-pane-client`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Open a spec for the Client on the pane's body." It follows spec 079, which left the keys the engine does not deliver to a Button (`←`, `→`, `PageUp`, `PageDown`, `Home`, `End`) as engine limits in spec 078 (changes 5, 11, 19, 24 and 49 of the page `astrolabe-100`).

## What the engine says about a Client

Read from `types/engine/claude-code.d.ts`, not assumed:

| Fact | Consequence |
|---|---|
| A `Client` is a module the engine runs on the drawing thread, without `$`, with its own state (`setState`), timers (`every`), pointer and key listeners, and `post` to the hooks. | Selection, scroll and fold can change with no round trip. |
| `onKey` is "reached while **a click** has given it the focus; Escape returns that". | The keys arrive only after the person clicks inside the region. `$.ui.focus` takes a Button, Input or Select key, not a Client. |
| The keys it receives are `up`, `down`, `left`, `right`, `return`, `tab`, `backspace`, `delete`, `pageup`, `home`, the characters typed, with `ctrl`, `shift`, `meta`. | The missing keys of spec 078 become available there. |
| `post` sends plain data, one per frame at most, as `ui.message` to this plugin's hooks. | Every action (tick request, advisor, close) is a message the hooks apply. |
| Props are plain data of at most 100,000 characters; the tree at most 20,000 nodes, 32 deep. A throw, an overrun or a render loop unmounts the instance. | A large project needs a window of rows, and a fallback when the instance is gone. |
| The pane's own focus ring already moves with Tab and the arrows among Button, Input, Select and Link elements, and the wheel and arrows reach the mod as `ui.scroll`. | Tab and the arrows are not new; the Client adds the keys the ring does not take, and only while it has the click. |

## Decision this spec asks for

The click is the cost. Without it nothing arrives, so the Client does not give "real arrow keys the
moment the pane opens". It gives them after one click on the list, and keeps them until Esc. The
spec builds a prototype first and stops there if that is not worth it.

## User scenarios

### US1: Fold and page with the keys a file tree has (P1)

After a click on the Specs list: `→` opens the selected spec, `←` folds it (on a task, it selects
the spec), `PageDown` and `PageUp` move a window, `Home` and `End` go to the ends, `Enter` and the
existing letters (`t`, `e`, `x`, `u`) act as before.

**Acceptance**: with a Client mounted, `ui.key({ key: 'right' })` opens the selected spec and
`ui.key({ key: 'pagedown' })` moves the window, in the test kit, with no `ui.scroll`.

### US2: Selection and scroll with no round trip (P2)

Moving the selection or the window changes the Client's state and redraws at once; the hooks hear
of it only when something else must change (a fold, an action).

### US3: The pane works without it (P1)

On a surface without `Client`, past the size limits, or after the instance unmounts, the pane
draws the rows it draws on 0.138.1. Nothing is lost.

## Requirements

- **FR-001** A surface module `hooks/surfaces/specs-client.tsx` draws the Specs body rows from props: the rows (text, role, indent, selected, task or spec key), the window, the colours as a token map.
- **FR-002** The module keeps selection and scroll as local state and handles `up`, `down`, `left`, `right`, `pageup`, `pagedown`, `home`, `end`, `return`, and the letters `t`, `e`, `x`, `u`, `p`, `a` by posting `{ op, key }`.
- **FR-003** `register.tsx` handles `ui.message` from that instance: it applies the same functions the Enter, scroll and button handlers use today (`toggled`, `allToggled`, `tickSuggestion`, `confirmPress`), so a key and a click do the same.
- **FR-004** The rows handed to the Client are the window the pane shows, at most 200 rows and 80,000 characters; a larger list is windowed in the hooks and the Client asks for the next window with `{ op: 'window', from }`.
- **FR-005** When `Client` is not in the element table, or props would pass the limit, or the instance was unmounted, `paneTree` draws the rows itself (spec 078).
- **FR-006** The hover and the selection mark are drawn by the module (absolute, no reflow, as in spec 079).
- **FR-007** The accessible mode draws no Client (text, no motion); rows come from `paneTree`.
- **FR-008** The links `↗`, the row buttons (advisor, gstack skills, copy, close) and the filter box stay in the Pane tree above and below the Client region; they are not moved into it.

## Success criteria

- **SC-001** In the test kit a mounted Pane with the Client answers `ui.key` for the nine keys of FR-002.
- **SC-002** With the Client unmounted or absent, the integration tests of specs 066, 078 and 079 pass unchanged.
- **SC-003** At 1,000 specs the props stay under 100,000 characters.
- **SC-004** `tsc --noEmit`, `claude plugin validate .` and `claude plugin test .` pass.

## Out of scope

- Setup and PRs bodies (they keep spec 079's arrows and Enter).
- A Client that takes the focus without a click: the engine does not offer it.
- Replacing the filter box, the tab row or the footer.

## Assumptions

- A click on the list is acceptable to the owner. If it is not, the spec stops after T001.
- `Link`, `Button` and `Text` inside a Client behave as in the Pane tree (the Client's element table is the terminal's less `Client`, `Raster` and `Image`).
