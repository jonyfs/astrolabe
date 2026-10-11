# Research: Model and Effort Per Skill

**Feature**: 030-model-effort-per-skill
**Date**: 2026-10-10

## Skill Model Map

**Decision**: Assign capability tiers to each skill based on complexity and analysis depth required

**Skill Categories and Tiers**:

### Spec Kit Skills (from `.specify/integrations/speckit.manifest.json`)

| Skill | Tier | Model | Effort | Rationale |
|-------|------|-------|--------|-----------|
| specify | deep-reasoning | Best available | max | Requirements analysis needs deep understanding |
| clarify | balanced-coding | Default | high | Q&A resolution needs good reasoning |
| plan | deep-reasoning | Best available | max | Architecture design needs deep reasoning |
| tasks | balanced-coding | Default | high | Task breakdown is structured but needs context |
| analyze | deep-reasoning | Best available | max | Cross-artifact analysis needs deep reasoning |
| checklist | fast-lightweight | Fast/cheap | low | Checklist generation is straightforward |
| implement | balanced-coding | Default | high | Code implementation needs balance |
| converge | balanced-coding | Default | high | Gap analysis needs good context |
| taskstoissues | fast-lightweight | Fast/cheap | low | Issue creation is mechanical |
| constitution | deep-reasoning | Best available | max | Principles definition needs deep thought |

### gstack Skills (from `.specify/integrations/gstack.manifest.json`)

| Skill | Tier | Model | Effort | Rationale |
|-------|------|-------|--------|-----------|
| benchmark | balanced-coding | Default | high | Performance analysis |
| benchmark-models | fast-lightweight | Fast/cheap | low | Comparison table generation |
| browse | balanced-coding | Default | high | Web interaction |
| canary | balanced-coding | Default | high | Monitoring |
| cso | deep-reasoning | Best available | max | Security audit needs deep analysis |
| careful | fast-lightweight | Fast/cheap | low | Safety checks |
| claude | balanced-coding | Default | high | Code review |
| codex | balanced-coding | Default | high | Code review |
| diagram | balanced-coding | Default | high | Visual design |
| design-consultation | deep-reasoning | Best available | max | Design system creation |
| design-html | balanced-coding | Default | high | HTML generation |
| design-review | balanced-coding | Default | high | Visual QA |
| design-shotgun | deep-reasoning | Best available | max | Design exploration |
| document-generate | balanced-coding | Default | high | Documentation |
| document-release | balanced-coding | Default | high | Release docs |
| health | fast-lightweight | Fast/cheap | low | Health checks |
| investigate | deep-reasoning | Best available | max | Debugging needs deep analysis |
| learn | fast-lightweight | Fast/cheap | low | Knowledge retrieval |
| office-hours | deep-reasoning | Best available | max | Product strategy |
| plan-ceo-review | deep-reasoning | Best available | max | Strategy review |
| plan-design-review | deep-reasoning | Best available | max | Design review |
| plan-devex-review | deep-reasoning | Best available | max | DX review |
| plan-eng-review | deep-reasoning | Best available | max | Technical review |
| qa | balanced-coding | Default | high | Quality assurance |
| qa-only | balanced-coding | Default | high | Bug reporting |
| retro | balanced-coding | Default | high | Retrospective |
| review | balanced-coding | Default | high | Code review |
| ship | balanced-coding | Default | high | Release management |
| spec | deep-reasoning | Best available | max | Specification creation |
| ... | balanced-coding | Default | high | Various |

---

## turn.step Hook

**Decision**: Use existing `turn.step` hook pattern (already used for `noteModel` in register.tsx)

**Rationale**:
- Hook runs at each turn step, can modify the request before it's sent
- Can check `e.agentId` or `skillRunning` to identify active skill
- Can modify `e.model` and `e.effort` for the request
- Already used for `skillModels === 'auto'` (see line 1072-1099 in register.tsx)

**Implementation**:
```typescript
on('turn.step', async ($, e, next) => {
  if (skillModels === 'auto' && e.agentId === undefined) {
    const skill = skillRunning; // Set when skill starts
    const pick = skillModelFor(skill);
    if (pick) {
      return next({ ...e, model: pick.model, effort: pick.effort });
    }
  }
  return next(e);
});
```

**Existing Code**: Lines 1072-1099 in register.tsx already implement this pattern for `noteModel` and `skillModels === 'auto'`.

---

## Model Tiers

**Decision**: Use three tiers per AI-JEDI instructions (section 12)

| Tier | Resolution |
|------|------------|
| deep-reasoning | Highest-capability model the active harness offers |
| balanced-coding | Harness's default general-purpose coding model |
| fast-lightweight | Cheapest model that still completes the task |

**Collapse Upward**: If harness offers fewer than 3 tiers:
- Absent fast-lightweight → balanced-coding
- Absent deep-reasoning → highest tier available
- **Never collapse downward** (deep-reasoning → balanced-coding prohibited)

---

## Context Re-read

**Decision**: Model switching re-reads context (as noted in plugin.json skillModels option)

**From plugin.json**:
> "switching models re-reads the context, so it costs more on long sessions"

**Implication**: Auto mode should only switch when necessary, not on every request. The `turn.step` hook modifies the request, and the engine handles context re-reading.

---

## Pane Tab Integration

**Decision**: Add new "models" tab to `PANE_TABS` in `hooks/surfaces/pane.tsx`

**Existing Pattern**: 
- `PANE_TABS` array defines all tabs (line 11-19 in pane.tsx)
- Tab content rendered via `paneTree` with body function
- Register.tsx handles tab selection and body rendering (lines 2950-3012)

**New Tab**: 
- Tab ID: `'models'` 
- Label: `'tab.models'`
- Hotkey: `'8'` (next available)
- Body: `modelSkillTabBody` function