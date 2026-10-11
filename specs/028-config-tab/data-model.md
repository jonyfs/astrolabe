# Data Model: Config Tab

**Feature**: 028-config-tab
**Date**: 2026-10-10

## Entities

### ConfigOption

Represents a single configuration option from plugin.json userConfig.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| key | string | Yes | Option identifier (e.g., "theme", "compactMode") |
| type | 'string' \| 'number' \| 'boolean' \| 'enum' | Yes | Input type |
| default | string \| number \| boolean \| string[] | Yes | Default value |
| description | string | Yes | Human-readable description |
| enum | string[] | No | Allowed values for enum type |
| min | number | No | Minimum value for number type |
| max | number | No | Maximum value for number type |

---

### ConfigSchema

Complete schema derived from plugin.json userConfig.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| options | Record<string, ConfigOption> | Yes | All config options keyed by name |
| version | string | Yes | Plugin version for schema versioning |

---

### ConfigFormState

Runtime state of the config form.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| values | Record<string, unknown> | Yes | Current field values |
| errors | Record<string, string> | Yes | Validation errors by field key |
| dirty | Record<string, boolean> | Yes | Whether field has been modified |
| isSubmitting | boolean | Yes | Submit in progress |
| submitError | string | No | Form-level error message |

---

### ConfigSaveResult

Result of save operation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| success | boolean | Yes | Whether save succeeded |
| errors | Record<string, string> | No | Field errors if failed |
| message | string | No | Success/error message |
| reloadRequired | boolean | Yes | Whether mod reload is needed |

## Relationships

- ConfigSchema → ConfigOption (one-to-many)
- ConfigFormState.values keys match ConfigSchema.options keys
- ConfigSaveResult.reloadRequired = true on success

## Validation Rules

- **string**: Must be string, non-empty if required
- **number**: Must be valid number, within min/max if specified
- **boolean**: Must be boolean
- **enum**: Value must be in enum array
- All fields required unless explicitly optional

## State Transitions

```
ConfigFormState (initial: values=defaults, errors={}, dirty={})
    │
    ├─ User edits field → dirty[key]=true, validate on blur
    │
    ├─ Validation passes → errors[key]=undefined
    │
    ├─ Validation fails → errors[key]=message
    │
    ├─ User clicks Save → isSubmitting=true
    │       │
    │       ├─ Validation fails → isSubmitting=false, show errors
    │       │
    │       └─ Validation passes → $.config.set() → success
    │                           │
    │                           ├─ success → ConfigSaveResult.success=true, reloadRequired=true
    │                           │
    │                           └─ failure → ConfigSaveResult.success=false, errors populated
    │
    └─ Mod reloads with new config
```