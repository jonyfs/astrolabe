---
track: quick
status: active
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
