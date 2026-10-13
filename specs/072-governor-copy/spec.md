---
track: quick # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Governor Question and Update Toast Copy

**Feature Branch**: `072-governor-copy`

**Created**: 2026-10-13

**Status**: Draft

**Input**: Audit of the design canvas (board 5) against 0.135.0: the governor question, its options and the update toast read differently from the board.

**Design reference**: `docs/design/astrolabe-redesign.html`, board b5.

## What the board shows

- The question: `‖ 7d at 81%▴ · code-reviewer is queued until Mon 07:00`.
- The options: `Keep it queued (applied)`, `Run it now`, `Lift holds for 1 hour`; the cautious default is already applied when the question opens.
- The toast for a new version: `astrolabe ⬆ 0.124.0 on disk · reloading plugins`.

## Requirements

- **FR-001**: The hold question MUST read `‖ <window> at <n>%<mark> · "<description>" is queued until <reset>`, and the pause question `‖ <window> at <n>%<mark> · Claude wants to run <tool>; paused until <reset>`.
- **FR-002**: The default option MUST carry `(applied)`: the default has already been applied when the question opens. `Drop this request` stays as a fourth hold option: it removes a capability the board does not mention.
- **FR-003**: The footer MUST say that the cautious default is already applied and that Esc or no answer keeps it.
- **FR-004**: A new message kind `update` MUST draw `astrolabe ⬆ …`; the reload toasts use it and read `<version> on disk (running <v>) · reloading plugins`.
- **FR-005**: All four languages carry the new strings.

## Tasks

- [x] T001 Tests: question text and options in `tests/core/governor.test.ts`, the pane in `tests/integration/governor-ask.test.tsx`, the prefix in `tests/core/message.test.ts`, the toast in `tests/integration/reload-on-update.test.ts`
- [x] T002 `hooks/core/governor.ts` question builders, `hooks/core/message.ts` kind, i18n in four languages
- [x] T003 README governor-question section
