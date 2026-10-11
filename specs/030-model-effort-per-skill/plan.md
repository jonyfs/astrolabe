# Implementation Plan: Model and Effort Per Skill

**Branch**: `030-model-effort-per-skill` | **Date**: 2026-10-10 | **Spec**: specs/030-model-effort-per-skill/spec.md

**Input**: Feature specification from `/specs/030-model-effort-per-skill/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Create a Model/Skill tab showing the optimal model and effort for each gstack and Spec Kit skill. Implement `skillModels: "auto"` mode that uses a `turn.step` hook to route each skill's requests to its optimal model/effort.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20.x

**Primary Dependencies**: Existing pane tab infrastructure, `turn.step` hook, `skillModels` option, model capability tiers

**Storage**: `$.config` (plugin config API), `$.store` for skill model mappings

**Testing**: Vitest (unit), integration tests via test fixtures

**Target Platform**: Claude Code terminal (desktop + web), Desktop app

**Project Type**: Claude Code mod (plugin)

**Performance Goals**: Tab load <500ms, auto mode routing <100ms overhead

**Constraints**: Must work within existing pane tab system, model switching re-reads context

**Scale/Scope**: ~30 skills (gstack + Spec Kit), 3 capability tiers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single project structure (no new repos) ✓
- No external services required ✓
- TypeScript/React only ✓
- Uses existing `$.config` API ✓
- Principle II: README update required in same PR
- Principle III: Native mod, zero settings - uses `$.config.set` correctly
- Principle IV: Pure core, thin surfaces - logic in `hooks/core/`, UI in `hooks/surfaces/`
- Principle XIII: Spec Kit for every change ✓

## Project Structure

### Documentation (this feature)

```text
specs/030-model-effort-per-skill/
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
│   ├── skill-models.ts      # Skill model/effort mappings
│   └── skill-model-hook.ts  # turn.step hook for auto mode
├── surfaces/
│   └── model-skill-tab.tsx  # Model/Skill tab component
└── register.tsx             # Tab and hook registration

tests/
├── contract/
│   └── model-skill-contract.test.ts
├── integration/
│   └── model-skill-auto.test.ts
└── unit/
    └── skill-models.test.ts
```

**Structure Decision**: Core logic in `hooks/core/`, UI in `hooks/surfaces/`, follows existing pane tab pattern. Reuses existing `skillModels` option.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. All work fits within existing mod structure.

## Phase 0: Research (NEEDS CLARIFICATION Resolution)

### Unknowns to Research

| Item | Question | Research Task |
|------|----------|---------------|
| Skill model map | What are the optimal model/effort for each skill? | Audit existing gstack and Spec Kit skills, assign tiers |
| turn.step hook | How to intercept and modify model/effort per request? | Research `turn.step` hook API in register.tsx |
| Model tiers | What are the capability tiers? | deep-reasoning, balanced-coding, fast-lightweight per AI-JEDI |
| Context re-read | How does model switching affect context? | Document the re-read behavior from plugin.json |

### Research Output

*To be populated by research agents and consolidated into research.md*

## Phase 1: Design & Contracts

### Data Model (data-model.md)

Entities to define:
- **SkillModelConfig**: skill name → { model, effort, tier, category }
- **SkillTier**: deep-reasoning, balanced-coding, fast-lightweight
- **AutoModeState**: current active skill, applied model/effort

### Contracts (/contracts/)

- **model-skill-contract.json**: Input (skill name), Output (model, effort, tier)
- **auto-mode-contract.json**: Input (skill, request), Output (modified request)

### Quickstart (quickstart.md)

Validation scenarios:
1. Open Model/Skill tab → verify all skills listed with model/effort
2. Set skillModels=auto → run a skill → verify correct model used
3. Set skillModels=off → run a skill → verify default model used
4. Verify active skill highlighted during execution
