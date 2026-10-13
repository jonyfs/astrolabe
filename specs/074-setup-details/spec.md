---
track: quick # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Setup Tab Details

**Feature Branch**: `074-setup-details`

**Created**: 2026-10-13

**Status**: Draft

**Input**: Audit of the design canvas (board 4, Setup) against 0.135.0.

## Requirements

- **FR-001**: `quietHours` and `governThresholds` MUST sit in the Usage governor group of the Setup tab, not under Integrations.
- **FR-002**: The model-per-skill heading MUST carry the option's value: `Model per skill  skillModels: auto`.
- **FR-003**: The skill running now MUST end with `← running`, in the four languages.

## Deliberately not changed

Inline pickers (`‹ compact ›`), the `(nerd here)` note on `icons` and the option find (`/`) conflict with the draft-and-save model of the Config tab (054 #63) and are left for the owner.

## Tasks

- [x] T001 Test: `optionGroup` for the two options
- [x] T002 `hooks/core/spec-actions.ts`, `hooks/register.tsx`, i18n
