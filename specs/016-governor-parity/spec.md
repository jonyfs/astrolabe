---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: What the usage-governor skill has that Astrolabe lacked

**Created**: 2026-10-07 · **Source**: the owner's request (`/investigate`, 2026-10-07): bring over what makes sense from the usage-governor skill

## Problem

Astrolabe banded only the fullest window, so an override given for one window lifted every
window's ceiling. Usage moving around 80% held and released subagents on every reading. A window
whose reset time had passed kept its last percentage until the next reading, so subagents stayed
held after the reset. Nothing showed the governor's state besides the status entry.

## Requirements

- **FR-001**: Every window MUST be banded against its own thresholds. The binding window is the
  one in the highest band, then the fuller one.
- **FR-002**: An override (`/astrolabe allow`, or a lift from the 015 question) MUST lift only
  the window binding when it was given; an override without a window (from 0.10.0 and before)
  lifts every window.
- **FR-003**: Hysteresis: once a window reaches 80%, it MUST stay in hold down to 75%. A window
  read with a reset time more than 5 minutes away from the held one is a new window.
- **FR-004**: A window whose reset time has passed is renewed. Its percentage is unknown until
  the next reading. Until then the band is at least throttle with a cap of 1, and the status
  entry says `5h renewed`; the status is redrawn at the reset time.
- **FR-005**: The pane's Session tab MUST show the windows and the band, the subagents running
  against the cap, the queue, an active override with its window, and an active lift.
- **FR-006**: Left out, with the reason in the README: thresholds set from a config file (Claude
  can run `claude plugin configure`), an own `/usage` probe, a release ramp after a reset, a
  command line, an audit log, Codex and Copilot.
- **FR-007**: Version 0.11.0; README and audit report updated.

## Tasks

- [X] T001 Failing unit tests in `tests/core/governor.test.ts` and integration tests in `tests/integration/governor.test.ts`
- [X] T002 `decide`, `nextHeld` and `usageRows` in `hooks/core/governor.ts`; `held` and the override's `kind` in `types/index.d.ts`
- [X] T003 Wiring in `hooks/register.tsx`: the held window on each reading, the override's window, the status at the reset, the Session tab rows
- [X] T004 README, audit report, version 0.11.0
