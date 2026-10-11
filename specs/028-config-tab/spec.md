---
track: full
status: done
---

# Feature Specification: Config Tab

**Feature Branch**: `028-config-tab`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "A pane tab with an editable form of every option and a Save button that applies them through `$.config.set`; the mod reloads with the new values."

## User Scenarios & Testing

### User Story 1 - Config Tab UI (Priority: P1)

As a user, I want a dedicated Config tab in the pane so that I can view and modify all plugin options without editing JSON files.

**Why this priority**: Configuration should be accessible through the UI, not require manual file editing.

**Independent Test**: Can be fully tested by opening the pane, navigating to Config tab, and verifying all options are displayed with correct current values.

**Acceptance Scenarios**:
1. **Given** the pane is open, **When** I click the Config tab, **Then** all userConfig options are shown in an editable form
2. **Given** I modify an option, **When** I click Save, **Then** the value is persisted via `$.config.set` and the mod reloads

---

### User Story 2 - Option Validation (Priority: P2)

As a user, I want validation feedback when entering invalid values so that I don't break the configuration.

**Why this priority**: Prevents configuration errors that could break the mod.

**Independent Test**: Can be fully tested by entering invalid values and verifying appropriate error messages.

**Acceptance Scenarios**:
1. **Given** a numeric option, **When** I enter non-numeric text, **Then** an error is shown and Save is disabled
2. **Given** an enum option, **When** I select an invalid value, **Then** validation prevents save

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a Config tab in the pane alongside existing tabs
- **FR-002**: System MUST render an editable form for every `userConfig` option with appropriate input types (text, number, boolean, select)
- **FR-003**: System MUST show current values as defaults in the form
- **FR-004**: System MUST persist changes via `$.config.set` when Save is clicked
- **FR-005**: System MUST reload the mod after successful save to apply new values
- **FR-006**: System MUST validate input against option schema (type, enum, min/max) before saving

### Key Entities

- **Config Option**: A single configuration item with key, type, default, description, and constraints
- **Config Form**: The complete form containing all options grouped by category
- **Config Schema**: The validation rules derived from `userConfig` definition

## Success Criteria

### Measurable Outcomes

- **SC-001**: Config tab loads in <500ms with all options rendered
- **SC-002**: All `userConfig` options are editable with correct input types
- **SC-003**: Save persists changes and triggers mod reload within 1 second
- **SC-004**: Invalid input is rejected with clear error message
- **SC-005**: No console errors when interacting with Config tab

## Assumptions

- The `userConfig` schema in plugin.json is the source of truth for options
- `$.config.set` API is available and works as documented
- Mod reload mechanism exists and can be triggered programmatically
- Pane tab infrastructure supports adding new tabs