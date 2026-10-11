---
track: full
status: active
---

# Feature Specification: Model and Effort Per Skill

**Feature Branch**: `030-model-effort-per-skill`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "A table of the best model and effort for each gstack and Spec Kit skill, shown in a tab; in `auto` mode a `turn.step` hook sends the request with that model and effort while the skill runs."

## User Scenarios & Testing

### User Story 1 - Skill Model Table (Priority: P1)

As a user, I want a tab showing the best model and effort for each skill so that I can understand and configure which model each skill uses.

**Why this priority**: Transparency and control over model selection is important for cost and quality management.

**Independent Test**: Can be fully tested by opening the tab and verifying all skills are listed with their model/effort.

**Acceptance Scenarios**:
1. **Given** the Model/Skill tab is open, **When** I view it, **Then** all gstack and Spec Kit skills are listed with their recommended model and effort
2. **Given** a skill is running, **When** I check the tab, **Then** the active skill's model/effort is highlighted

---

### User Story 2 - Auto Mode Integration (Priority: P1)

As a user, I want the `auto` mode for `skillModels` option to automatically send each skill's requests with its optimal model and effort.

**Why this priority**: Automatic optimization improves quality and reduces manual configuration.

**Independent Test**: Can be fully tested by setting `skillModels: "auto"` and running a skill, verifying the correct model/effort is used.

**Acceptance Scenarios**:
1. **Given** `skillModels` is set to `"auto"`, **When** a Spec Kit skill runs, **Then** its requests use the configured model and effort
2. **Given** `skillModels` is set to `"auto"`, **When** a gstack skill runs, **Then** its requests use the configured model and effort
3. **Given** `skillModels` is `"off"`, **When** a skill runs, **Then** the default model/effort is used

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a table of all skills with their recommended model and effort
- **FR-002**: System MUST include both gstack skills and Spec Kit skills
- **FR-003**: System MUST implement `skillModels: "auto"` mode that routes requests per skill
- **FR-004**: System MUST use `turn.step` hook to intercept and modify model/effort per skill
- **FR-005**: System MUST show active skill's model/effort in the table when a skill is running
- **FR-006**: System MUST persist the skill model configuration

### Key Entities

- **SkillModelConfig**: Mapping of skill name → { model, effort, tier }
- **SkillTier**: Enum of capability tiers (deep-reasoning, balanced-coding, fast-lightweight)
- **AutoModeState**: Current auto mode status and active skill

## Success Criteria

### Measurable Outcomes

- **SC-001**: Model/Skill tab loads in <500ms with complete skill list
- **SC-002**: All known skills have model/effort entries
- **SC-003**: Auto mode correctly routes requests per skill within 100ms overhead
- **SC-004**: Active skill highlighted in table during execution
- **SC-005**: Configuration persists across sessions

## Assumptions

- Skill model recommendations are known and stable
- `turn.step` hook can modify request model/effort
- Model switching re-reads context (as noted in plugin.json)
- Existing `skillModels` option in plugin.json is the control