---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Terse Mode

**Feature Branch**: `031-terse-mode`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "An option that adds a terse-answer section to the system prompt (levels `lite` and `full`), so Claude writes only what is needed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lite Terse Mode (Priority: P1)

As a user, I want a "lite" terse mode that reduces wordiness in responses, so that I get cleaner output without excessive fluff.

**Why this priority**: The lite mode provides a subtle improvement to response quality by removing common filler words and unnecessary verbosity. This is the most commonly desired terse level.

**Independent Test**: Can be fully tested by setting `terseMode: "lite"` and observing that responses use fewer filler words and shorter phrases.

**Acceptance Scenarios**:

1. **Given** `terseMode` is set to `"lite"`, **When** Claude responds, **Then** responses avoid filler phrases like "I think", "In my opinion", "Certainly", "Let me explain"
2. **Given** `terseMode` is set to `"lite"`, **When** a technical explanation is requested, **Then** the explanation is direct and to the point

---

### User Story 2 - Full Terse Mode (Priority: P2)

As a user, I want a "full" terse mode that maximizes brevity, so that I get the most concise responses possible.

**Why this priority**: Full terse mode is for users who want maximum conciseness, accepting more aggressive abbreviation and omission of social pleasantries.

**Independent Test**: Can be fully tested by setting `terseMode: "full"` and observing that responses are significantly more concise than normal mode.

**Acceptance Scenarios**:

1. **Given** `terseMode` is set to `"full"`, **When** Claude responds, **Then** responses use fragments and abbreviations where contextually appropriate
2. **Given** `terseMode` is set to `"full"`, **When** a yes/no question is asked, **Then** the answer is a single word
3. **Given** `terseMode` is set to `"full"`, **When** an explanation is requested, **Then** only essential information is provided

---

### User Story 3 - Config Integration (Priority: P1)

As a user, I want to toggle terse mode through the Config tab, so that I can easily switch between normal and terse modes.

**Why this priority**: Configuration through the UI is essential for user control.

**Independent Test**: Can be fully tested by opening the Config tab, changing the `terseMode` option, and verifying the setting persists.

**Acceptance Scenarios**:

1. **Given** the Config tab is open, **When** I set `terseMode` to `"lite"` or `"full"` and save, **Then** the setting persists and is visible in the Config tab
2. **Given** `terseMode` is set to `"full"`, **When** I open the Config tab, **Then** I see the current setting

---

### Edge Cases

- What happens when terseMode is set to an invalid value like `"invalid"`?
- How does the system handle toggling between modes mid-conversation?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `terseMode` option in user config with values `"off"` (default), `"lite"`, and `"full"`
- **FR-002**: System MUST inject a terse-answer section into the system prompt when `terseMode` is `"lite"` or `"full"`
- **FR-003**: System MUST distinguish between `"lite"` and `"full"` terse modes with different prompt instructions
- **FR-004**: System MUST make the terse mode setting visible and editable in the Config tab
- **FR-005**: System MUST respect user's terse level choice for all responses

### Key Entities

- **TerseMode**: Enum of `"off" | "lite" | "full"`
- **UserConfig**: Extension point for user configuration options

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Configuration persists across sessions
- **SC-002**: `"lite"` mode reduces filler phrases by >50% compared to `"off"`
- **SC-003**: `"full"` mode reduces response length by >30% compared to `"off"`
- **SC-004**: Config tab correctly displays and toggles the terse mode option

## Assumptions

- The `prompt.compose` hook can inject context at session start
- The terse modes will use the same code path as the existing `humanize` and `claudeContext` options
- Users expect terse mode to affect only response style, not technical accuracy