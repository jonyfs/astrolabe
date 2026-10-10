---
track: quick
status: done
---
# Idle Poller and Manual Refresh

This quick spec adds two small improvements to the pane’s staleness logic.

- **Idle poller** – when the pane has been open for *10 minutes* without activity the local
band and pane refresh automatically.
- **Manual refresh key** – pressing `Ctrl‑R` triggers an immediate pane refresh.

The spec is satisfied once the following behavior can be observed:

1. The pane auto–refreshes after ten minutes of inactivity.
2. Pressing `Ctrl‑R` refreshes the pane immediately.

No changes to the core API are required; the spec is used purely to document UI behavior.

## Outcome

- The idle poller is a timer armed after each turn: ten minutes and one second later it runs the same refresh as the key, then re-arms, six times at most.
- The manual key is `r` (button `↻ r`): a pane Button's hotkey is one digit or one lowercase letter, so `Ctrl-R` is not available. `r` left the queue hotkeys.
- Tests: `tests/integration/live-sync.test.ts`, "idle poller and manual refresh (058)".
