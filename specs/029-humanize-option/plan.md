# Implementation Plan: Humanize Option

**Branch**: `029-humanize-option` | **Date**: 2026-10-10 | **Spec**: specs/029-humanize-option/spec.md

**Input**: Feature specification from `/specs/029-humanize-option/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a "humanize" boolean option to the Config tab that, when enabled, injects humanizer rules into Claude's system prompt via the `prompt.compose` hook. The option integrates with the existing Config tab infrastructure from spec 028.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20.x

**Primary Dependencies**: Existing Config tab (spec 028), `prompt.compose` hook, `$.config` API

**Storage**: `$.config` (plugin config API), plugin.json for schema

**Testing**: Vitest (unit), integration tests via test fixtures

**Target Platform**: Claude Code terminal (desktop + web), Desktop app

**Project Type**: Claude Code mod (plugin)

**Performance Goals**: Option toggle applies in <1s, no perceptible latency

**Constraints**: Must work within existing Config tab, no external dependencies, English-only UI

**Scale/Scope**: Single boolean option, prompt injection logic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single project structure (no new repos) ✓
- No external services required ✓
- TypeScript/React only ✓
- Uses existing `$.config` API ✓
- Principle II: README update required in same PR
- Principle III: Native mod, zero settings - uses `$.config.set` correctly
- Principle IV: Pure core, thin surfaces - logic in `hooks/core/`, UI in Config tab
- Principle XIII: Spec Kit for every change ✓

## Project Structure

### Documentation (this feature)

```text
specs/029-humanize-option/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Single project (DEFAULT)
hooks/
├── core/
│   ├── humanize-rules.ts    # Humanizer rules text
│   └── prompt-compose.ts    # Prompt composition hook
├── surfaces/
│   └── config-tab.tsx       # Updated to include humanize option
└── register.tsx             # Hook registration

tests/
├── contract/
│   └── humanize-contract.test.ts
├── integration/
│   └── humanize.test.ts
└── unit/
    └── humanize-rules.test.ts
```

**Structure Decision**: Core logic in `hooks/core/`, integrates with existing Config tab from spec 028. Minimal new code - just the option and prompt injection.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. All work fits within existing mod structure.

## Phase 0: Research (NEEDS CLARIFICATION Resolution)

### Unknowns to Research

| Item | Question | Research Task |
|------|----------|---------------|
| Prompt compose hook | How does `prompt.compose` work for system prompt injection? | Research existing `prompt.compose` usage in codebase |
| Humanizer rules | What exact rules to include? | Use existing humanizer skill rules, shortened |
| Config integration | How to add option to existing Config tab? | Use config schema from spec 028 |

### Research Output

*To be populated by research agents and consolidated into research.md*

## Phase 1: Design & Contracts

### Data Model (data-model.md)

Entities to define:
- **HumanizeOption**: boolean config option, default false
- **HumanizerRules**: string constant with rules text
- **PromptInjection**: mechanism to add/remove rules from `prompt.compose`

### Contracts (/contracts/)

- **humanize-contract.json**: Input (option value), Output (prompt modification)

### Quickstart (quickstart.md)

Validation scenarios:
1. Open Config tab → verify Humanize option present
2. Enable Humanize → verify rules added to prompt
3. Disable Humanize → verify rules removed from prompt
4. Verify persistence across reload