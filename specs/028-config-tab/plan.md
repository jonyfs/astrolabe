# Implementation Plan: Config Tab

**Branch**: `028-config-tab` | **Date**: 2026-10-10 | **Spec**: specs/028-config-tab/spec.md

**Input**: Feature specification from `/specs/028-config-tab/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Implement a Config tab in the pane that displays an editable form for all `userConfig` options from plugin.json. The form uses appropriate input types (text, number, boolean, select), validates against schema, and saves via `$.config.set` with automatic mod reload.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20.x

**Primary Dependencies**: React (via `$.ui`), Zod for validation, existing pane infrastructure

**Storage**: `$.config` (plugin config API), plugin.json for schema

**Testing**: Vitest (unit), integration tests via test fixtures

**Target Platform**: Claude Code terminal (desktop + web), Desktop app

**Project Type**: Claude Code mod (plugin)

**Performance Goals**: Tab load <500ms, save + reload <1s

**Constraints**: Must work within pane tab system, no external dependencies, English-only UI

**Scale/Scope**: All userConfig options (estimated 10-20), single new tab

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single project structure (no new repos) ✓
- No external services required ✓
- TypeScript/React only ✓
- Uses existing `$.config` API ✓
- Principle II: README update required in same PR
- Principle III: Native mod, zero settings - uses `$.config.set` correctly
- Principle IV: Pure core, thin surfaces - UI in `hooks/surfaces/`
- Principle XIII: Spec Kit for every change ✓

## Project Structure

### Documentation (this feature)

```text
specs/028-config-tab/
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
├── surfaces/
│   ├── config-tab.tsx      # New Config tab component
│   ├── config-form.tsx     # Form rendering logic
│   └── config-field.tsx    # Individual field components
├── core/
│   ├── config-schema.ts    # Schema derivation from plugin.json
│   └── config-validate.ts  # Validation logic
└── register.tsx            # Tab registration

tests/
├── contract/
│   └── config-tab-contract.test.ts
├── integration/
│   └── config-tab.test.ts
└── unit/
    └── config-validate.test.ts
```

**Structure Decision**: New tab in `hooks/surfaces/`, core logic in `hooks/core/`, registration in `hooks/register.tsx`. Follows existing pane tab pattern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. All work fits within existing mod structure.

## Phase 0: Research (NEEDS CLARIFICATION Resolution)

### Unknowns to Research

| Item | Question | Research Task |
|------|----------|---------------|
| Pane tab API | How to add a new tab to the existing pane? | Research existing tab registration in `hooks/register.tsx` and pane types |
| Config schema | How to derive form schema from plugin.json userConfig? | Analyze plugin.json structure and `$.config` API |
| Form components | What React components available via `$.ui`? | Check existing form patterns in codebase |
| Mod reload | How to trigger mod reload after config change? | Research `$.config.set` behavior and reload mechanism |
| Validation | Real-time vs on-submit validation? | Research best practices for form validation in mod context |

### Research Output

*To be populated by research agents and consolidated into research.md*

## Phase 1: Design & Contracts

### Data Model (data-model.md)

Entities to define:
- **ConfigOption**: key, type, default, description, constraints (enum, min, max)
- **ConfigSchema**: object with properties mapping to ConfigOption
- **ConfigFormState**: current values, errors, dirty flags
- **ConfigSaveResult**: success, errors, reloadRequired

### Contracts (/contracts/)

- **config-tab-contract.json**: Input (schema), Output (form state, save result)
- **config-field-contract.json**: Input (option), Output (rendered field, validation)

### Quickstart (quickstart.md)

Validation scenarios:
1. Open pane → click Config tab → verify all options render with current values
2. Modify a string option → click Save → verify persistence and reload
3. Modify a boolean option → click Save → verify persistence and reload
4. Enter invalid value (wrong type, out of range) → verify error shown, Save disabled
5. Verify mod reloads with new values applied
