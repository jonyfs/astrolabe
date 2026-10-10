---
track: quick
status: active
---
# HUD‑Inspired Usage Display

This quick spec introduces a new HUD‑style section that shows usage pace and hidden
values accurately.

- **Burn‑pace color** – the progress bar changes to red, amber or green depending on the
  current usage rate.
- **Wall‑clock reset** – the timer resets when the system clock changes.
- **Hide‑until‑relevant** – the HUD is shown only when the pane is in focus.

To satisfy the spec we need to see:

1. The bar adopts the correct color for the three pace levels.
2. The timer resets on a clock rollover.
3. The HUD disappears when the pane is not active.
