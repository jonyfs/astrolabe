---
track: full
status: done
---

# Feature Specification: Humanize Option

**Feature Branch**: `029-humanize-option`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "An option that adds a short, revised version of the humanizer rules to Claude's system prompt (`prompt.compose`), so everything Claude writes in the project follows them."

## User Scenarios & Testing

### User Story 1 - Humanize Option UI (Priority: P1)

As a user, I want a "Humanize" option in the Config tab so that I can enable human-like writing style for all Claude outputs in the project.

**Why this priority**: Writing style consistency is a core user experience feature that affects all Claude interactions.

**Independent Test**: Can be fully tested by enabling the option in Config tab and verifying the humanizer rules are added to `prompt.compose`.

**Acceptance Scenarios**:
1. **Given** the Humanize option is disabled, **When** I enable it and Save, **Then** humanizer rules are added to `prompt.compose`
2. **Given** the Humanize option is enabled, **When** I disable it and Save, **Then** humanizer rules are removed from `prompt.compose`

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST add a "humanize" boolean option to userConfig in plugin.json
- **FR-002**: System MUST add humanizer rules to `prompt.compose` when option is enabled
- **FR-003**: System MUST remove humanizer rules from `prompt.compose` when option is disabled
- **FR-004**: System MUST persist the option value via `$.config.set`
- **FR-005**: System MUST apply changes without requiring manual reload (mod reloads automatically)

### Key Entities

- **Humanize Option**: Boolean config option with default false
- **Humanizer Rules**: Short revised version of humanizer rules for system prompt
- **Prompt Compose**: The hook that builds Claude's system prompt

## Success Criteria

### Measurable Outcomes

- **SC-001**: Humanize option appears in Config tab with correct label and description
- **SC-002**: Enabling option adds humanizer rules to system prompt within 1 second
- **SC-003**: Disabling option removes humanizer rules from system prompt
- **SC-004**: Option value persists across sessions
- **SC-005**: No console errors when toggling the option

## Assumptions

- The `prompt.compose` hook is the extension point for system prompt modifications
- Humanizer rules can be expressed as a short string added to the prompt
- Mod reload mechanism handles config changes automatically
- Config tab infrastructure from spec 028 is available