# Research: Humanize Option

**Feature**: 029-humanize-option
**Date**: 2026-10-10

## Prompt Compose Hook

**Decision**: Use existing `prompt.compose` hook in `hooks/register.tsx`

**Rationale**:
- The mod already has a `prompt.compose` hook that builds system prompts
- Can inject additional rules by returning modified prompt
- Integration point: check `$.config.get('humanize')` and append rules if true

**Alternatives Considered**:
- New hook: More complex, not needed
- Direct prompt modification: Less maintainable

---

## Humanizer Rules

**Decision**: Use shortened version of existing humanizer skill rules

**Rationale**:
- Humanizer skill already exists in `.config/opencode/skills/humanizer/SKILL.md`
- Rules cover: inflated claims, sales language, vague sources, repetitive structure, stock AI words, passive voice, filler, chatbot artifacts
- Can be condensed to ~5-7 key rules for prompt injection

**Condensed Rules**:
1. Write in plain prose, avoid hype words and inflated claims
2. Use active voice, avoid passive constructions
3. Be specific - name sources, avoid vague attributions
3. Keep sentences varied, avoid repetitive structure
4. Skip filler words and em dashes, get to the point
5. Facts exact, no hallucinated details

**Alternatives Considered**:
- Full humanizer rules: Too long for prompt
- Custom rules: Reuse existing well-tested rules

---

## Config Integration

**Decision**: Add `humanize` option to plugin.json userConfig, automatically appears in Config tab via spec 028 schema

**Rationale**:
- Config tab (spec 028) dynamically reads userConfig from plugin.json
- Adding option to plugin.json automatically creates Config tab entry
- No code changes needed for UI - just schema addition

**Implementation**:
- Add `humanize` option to plugin.json userConfig
- Config tab will render as checkbox (boolean type)
- Save via existing `$.config.set` mechanism

**Alternatives Considered**:
- Hardcoded UI: Violates dynamic config principle
- Separate tab: Overkill for single option