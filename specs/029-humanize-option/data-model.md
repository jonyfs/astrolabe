# Data Model: Humanize Option

**Feature**: 029-humanize-option
**Date**: 2026-10-10

## Entities

### HumanizeOption

Represents the humanize configuration option.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| key | string | Yes | Option identifier ("humanize") |
| type | 'boolean' | Yes | Input type |
| default | boolean | Yes | Default value (false) |
| description | string | Yes | Human-readable description |
| title | string | Yes | Display title in Config tab |

---

### HumanizerRules

Constant string containing the humanizer rules for prompt injection.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | Yes | Formatted rules text for system prompt |
| version | string | Yes | Rules version for cache invalidation |

---

### PromptInjection

Mechanism for adding/removing rules from system prompt.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| enabled | boolean | Yes | Whether humanize is enabled |
| rulesText | string | Yes | Rules to inject |
| injectionPoint | string | Yes | Where in prompt to inject (e.g., "before-tools") |

## Relationships

- HumanizeOption (in plugin.json) → controls PromptInjection.enabled
- HumanizerRules (constant) → provides PromptInjection.rulesText
- PromptInjection → modifies `prompt.compose` output

## Validation Rules

- HumanizeOption: must be boolean, default false
- HumanizerRules.text: non-empty string
- PromptInjection: only injects when enabled=true