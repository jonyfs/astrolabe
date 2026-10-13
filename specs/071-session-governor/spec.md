---
track: quick # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Session Tab Matches Board 4

**Feature Branch**: `071-session-governor`

**Created**: 2026-10-13

**Status**: Draft

**Input**: Audit of the design canvas (board 4, "Pane: Session") against Astrolabe 0.135.0: the usage block lacks the figures beside each bar, the 24 hour trend with its projection, and the governor box with its queue and lift buttons.

**Design reference**: `docs/design/astrolabe-redesign.html`, board b4 (viewer https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL). Umbrella: [063-design-review](../063-design-review/spec.md).

## What the board shows and the code does not

1. Each bar carries its figures: `ctx 41%  82k/200k`, `5h 50%  resets 0h25`, `7d 81%▴ hold  88% in ≈3h`.
2. Under the 7d bar, a 24 hour trend: `7d · 24h ▁▁▂▂▂▃▃▃▄▄▄▄▅▅▅▆▆▆▆▇▇┄┄┄  now → reset`.
3. A governor box right under the bars when the governor acts or work is queued: state in one line (`‖ holding new subagents · 7d decides · until Mon 07:00`), each queued subagent with a `run now` button, the lift and revoke buttons, and `today: 2 holds · 0 pauses`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Figures beside the bars (Priority: P1)

A user opens the Session tab and reads each bar's absolute and relative figures without opening the Governor rows.

**Acceptance Scenarios**:

1. **Given** the context window is 82k of 200k, **When** the Session tab draws, **Then** the ctx row reads `41%  82k/200k`.
2. **Given** the deciding window will reach the next governor level before its reset at the current pace, **When** drawn, **Then** its row ends with `hold 88% in ≈3h`.
3. **Given** the engine gives no token figures, **When** drawn, **Then** the ctx row has the percent only (nothing invented).

### User Story 2 - A 24 hour trend with its projection (Priority: P2)

**Acceptance Scenarios**:

1. **Given** readings over the last 24 hours, **When** the Session tab draws, **Then** a row shows one block per hour, then `┄` cells towards the reset, then `now → reset`.
2. **Given** fewer than three readings, **When** drawn, **Then** no trend row shows.

### User Story 3 - The governor box (Priority: P1)

**Acceptance Scenarios**:

1. **Given** the band is hold, **When** drawn, **Then** a box under the bars states what is held, which window decides and until when.
2. **Given** queued subagents, **When** drawn, **Then** each is a row with a `run now` button (the existing run key).
3. **Given** a hold or pause, **When** drawn, **Then** `lift 1h` is a button in the box; **Given** an active override, **Then** `revoke` is one.
4. **Given** the governor is `ok` with an empty queue and no override, **When** drawn, **Then** no box shows.

## Requirements

- **FR-001**: `usageBarRows` MUST take optional `tokens` and `window` for context and print `41%  82k/200k` when both are known.
- **FR-002**: The deciding window's row MUST end with the next governor level it will reach before its reset (`hold 88% in ≈3h`), computed from the recorded readings; none when it will not.
- **FR-003**: A trend row MUST draw the last 24 hours, one block per hour (the latest reading of that hour, carried forward), up to eight `┄` cells towards the reset when the pace is positive, and `now → reset`; it MUST NOT draw with fewer than three readings.
- **FR-004**: The governor box MUST show only while the band is not `ok`, the queue is not empty or an override or lift is active; it MUST hold the state sentence, the queue rows with their run buttons, the `lift 1h` button while held or paused, and `revoke` while an override is active, and a `today: N holds · M pauses` summary.
- **FR-005**: The queue, lift and revoke rows MUST appear once: inside the box when it shows, in the Governor block otherwise.
- **FR-006**: Strings MUST exist in the four languages.

## Success Criteria

- **SC-001**: Core tests cover FR-001 to FR-004 on fixtures.
- **SC-002**: An integration test opens the Session tab at a hold and finds the box, one run button per queued item and the lift button.
- **SC-003**: README Session section and the capture are updated.

## Assumptions

- Cost chips of the board (`$4.10`) stay out: the README states Astrolabe shows no cost.
- The warning glyph stays `▲` (spec 064), not the board's `⚠`.

## Tasks

- [x] T001 Tests for the annotations, the trend and the box rows in `tests/core/session-usage.test.ts`
- [x] T002 `hooks/core/session-usage.ts` (pure)
- [x] T003 Context tokens and window kept in the session stats; `usageBarRows` takes them
- [x] T004 Session tab: notes, trend row and box wired in `sessionTabRows`; the queue, lift and revoke rows move into the box
- [x] T005 i18n keys in four languages; README Session section; capture; suites
