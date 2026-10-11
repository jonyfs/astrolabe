# Data Model: Model and Effort Per Skill

**Feature**: 030-model-effort-per-skill
**Date**: 2026-10-10

## Entities

### SkillModelConfig

Represents the model/effort configuration for a single skill.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| skill | string | Yes | Skill identifier (e.g., "specify", "plan", "benchmark") |
| category | 'speckit' \| 'gstack' | Yes | Skill category |
| tier | 'deep-reasoning' \| 'balanced-coding' \| 'fast-lightweight' | Yes | Capability tier |
| model | string | Yes | Model identifier (e.g., "claude-4.5-sonnet", "gpt-5.2") |
| effort | 'low' \| 'medium' \| 'high' \| 'max' | Yes | Effort level |
| description | string | No | Human-readable description |

---

### SkillTier

Enum of capability tiers (per AI-JEDI section 12).

| Tier | Resolution |
|------|------------|
| deep-reasoning | Highest-capability model the active harness offers |
| balanced-coding | Harness's default general-purpose coding model |
| fast-lightweight | Cheapest model that still completes the task |

---

### SkillModelMap

Complete mapping of all skills to their model configurations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| skills | Record<string, SkillModelConfig> | Yes | All skill configurations keyed by skill name |
| version | string | Yes | Map version for cache invalidation |
| updatedAt | ISO8601 | Yes | Last update timestamp |

---

### AutoModeState

Runtime state for auto mode.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| enabled | boolean | Yes | Whether auto mode is active (skillModels === 'auto') |
| activeSkill | string | No | Currently running skill |
| appliedModel | string | No | Model currently applied |
| appliedEffort | string | No | Effort currently applied |
| contextReReadCount | number | Yes | Number of context re-reads this session |

---

### ModelSkillTabRow

Row data for the Model/Skill tab display.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| skill | string | Yes | Skill name |
| category | string | Yes | 'speckit' or 'gstack' |
| tier | string | Yes | Capability tier |
| model | string | Yes | Model identifier |
| effort | string | Yes | Effort level |
| isActive | boolean | Yes | Whether skill is currently running |

## Relationships

- SkillModelMap → SkillModelConfig (one-to-many)
- AutoModeState references SkillModelConfig for active skill
- ModelSkillTabRow derived from SkillModelConfig + AutoModeState

## Validation Rules

- SkillModelConfig.tier must be one of three tiers
- SkillModelConfig.effort must be valid effort level
- AutoModeState.enabled = (skillModels option === 'auto')
- Context re-read count increments on model change