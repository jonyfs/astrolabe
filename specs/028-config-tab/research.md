# Research: Config Tab

**Feature**: 028-config-tab
**Date**: 2026-10-10

## Pane Tab API

**Decision**: Add new tab via `hooks/register.tsx` following existing pattern

**Rationale**: 
- Existing tabs (Dashboard, History, etc.) registered in `register.tsx`
- Pane component accepts tabs array in `hooks/surfaces/pane.tsx`
- Tab structure: `{ id, label, icon, content }`

**Alternatives Considered**:
- Dynamic tab injection: More complex, not needed for single tab
- Separate pane: Overkill, breaks UI consistency

---

## Config Schema Derivation

**Decision**: Parse `userConfig` from `.claude-plugin/plugin.json` at runtime

**Rationale**:
- `plugin.json` is the source of truth for configuration
- `userConfig` property contains options with type, default, description
- Can be read via `import pluginJson from '../.claude-plugin/plugin.json'`
- TypeScript types from `plugin.json` ensure type safety

**Schema Structure** (from plugin.json):
```json
{
  "userConfig": {
    "optionName": {
      "type": "string|number|boolean|enum",
      "default": "value",
      "description": "Human readable description",
      "enum": ["opt1", "opt2"],  // for enum type
      "min": 0,                  // for number
      "max": 100                 // for number
    }
  }
}
```

**Alternatives Considered**:
- Separate schema file: Duplication risk
- Hardcoded schema: Not maintainable

---

## Form Components via `$.ui`

**Decision**: Use existing `$.ui` components: `TextField`, `Checkbox`, `Select`, `Button`, `Box`, `Text`

**Rationale**:
- Mod must use theme tokens (Principle IX)
- Native elements ensure consistency (Principle IV)
- `$.ui.resolve(e)` provides typed components
- Existing patterns in `hooks/surfaces/` show usage

**Available Components**:
- `TextField` - for string, number inputs
- `Checkbox` - for boolean
- `Select` - for enum
- `Button` - for Save
- `Box`, `Text` - layout

**Alternatives Considered**:
- Custom components: Violates Principle IV (Pure Core, Thin Surfaces)
- HTML inputs: No theme integration

---

## Mod Reload Mechanism

**Decision**: `$.config.set` triggers automatic reload; no manual trigger needed

**Rationale**:
- Mod engine watches config changes
- `$.config.set(key, value)` persists and signals reload
- Plugin process restarts with new config
- No additional API call required

**Alternatives Considered**:
- Manual reload API: Not exposed
- Session restart: Too disruptive

---

## Validation Strategy

**Decision**: Real-time validation on blur + submit validation

**Rationale**:
- Immediate feedback on blur (field-level)
- Final validation on submit (form-level)
- Zod schema derived from plugin.json for type safety
- Errors displayed inline below fields

**Validation Rules**:
- Type matching (string, number, boolean, enum)
- Enum values must be from allowed list
- Number min/max bounds
- Required fields (all userConfig options are required by default)

**Alternatives Considered**:
- Only on submit: Poor UX
- Only on change: Too noisy
- No validation: Risk of invalid config