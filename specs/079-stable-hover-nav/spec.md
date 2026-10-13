---
track: quick # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Stable hover and arrow navigation in Setup and PRs

**Feature Branch**: `079-stable-hover-nav`

**Created**: 2026-10-13

**Input**: "Navigation is still not good in Specs, 3 and Setup; hovering moves the information on the screen. Consider 100 fixes. Check whether CSS, HTML and JavaScript can be used on this screen as a mod."

## Root cause

Four hover reveals sat in the flow of the layout (`display: none` to `flex` in a column or row).
A box that appears in the flow takes room, so every element after it moved:

| Where | What appeared | Effect |
|---|---|---|
| Setup option row | the card with the default and the description | the settings below moved down |
| Specs row | `↗ plan↗ tasks↗` | the row's text shifted and was cut again |
| Band | the step card and the `+N` card | the prompt and the transcript moved |
| Pane footer | the sentence under a chip | the footer grew by a row |

The engine states the cure: a Box with `position: "absolute"` takes no room, so showing it
moves nothing. A card painted after its rows covers them instead of being covered.

Navigation: the arrow keys moved a selection only in Specs. In Setup and PRs they scrolled, and
Enter did nothing.

Found: 4 reflow defects and 3 navigation gaps (arrows, selection mark, Enter). That is the real
count; no list of 100 was padded.

## Requirements

- **FR-001** A Setup option's card is an absolute Box drawn after the rows, in its row's hover group.
- **FR-002** The links of an unselected spec row are one absolute group at the row's right edge.
- **FR-003** A band card is absolute, over the band row, full width.
- **FR-004** The footer's chip sentence has a slot of one row that is always there.
- **FR-005** In Setup the arrow keys pick an option (`❯`); Enter flips a boolean or takes the next choice, as a draft.
- **FR-006** In PRs the arrow keys pick a pull request; Enter runs its first action (approve, update, merge) after a second press.

## CSS, HTML and JavaScript

- **HTML and CSS**: no. A mod returns a tree of `Box`, `Text`, `Button`, `Input`, `Select`, `Link`,
  `Code` and `Markdown`; `Box` takes a flexbox subset (direction, padding, margin, border, absolute
  position, `hover`). The desktop adds `Svg` (a vector drawing, off the page, no script).
- **JavaScript**: yes, as a `Client` surface module (`dots-client.tsx`, `dial-client.tsx` are two).
  It runs on the drawing thread without `$`, keeps its own state, takes `onKey` (up, down, left,
  right, return, tab, pageup, home), `onPointer` and timers, and posts to the hooks with `ui.message`.
  A Client could own the whole body of the pane and give real arrow, Tab and PageUp keys with
  instant hover and selection. It is a rewrite of the pane's body, so it is a separate spec.

## Success criteria

- **SC-001** No hover site draws a box in the flow (`display: none` with `hover` and no `position: absolute`).
- **SC-002** `tsc`, `claude plugin validate .` and the tests pass.
