---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: A pinned footer and a scrolling body

**Created**: 2026-10-08 · **Source**: the owner asked that the footer stay put and that a long tab scroll inside, with arrows saying more is there

## Requirements

- **FR-001**: On every tab the footer MUST stay on the pane's last rows; a tab longer than the
  pane MUST show a window of its rows, never pushing the footer out of view.
- **FR-002**: When rows are hidden above or below, a `▲ N more (k)` or `▼ N more (j)` row MUST say
  so; pressing it, or `k` and `j`, scrolls by a window less one row. The wheel and the arrow keys
  scroll the body too (`ui.scroll`).
- **FR-003**: The Dashboard MUST scroll by whole sections, so a chart is never cut in half.
- **FR-004**: The scroll position MUST be kept per tab for the session.

## Tasks

- [x] T001 Tests in `tests/integration/pinned-footer.test.tsx` and `tests/integration/dashboard.test.tsx`
- [x] T002 `windowUnits`, `dashboardSections`, the arrow rows, the `ui.scroll` hook
- [x] T003 README, version 0.28.0
