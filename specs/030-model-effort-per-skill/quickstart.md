# Quickstart: Model and Effort Per Skill

**Feature**: 030-model-effort-per-skill
**Date**: 2026-10-10

## Prerequisites

- Node.js 20+
- npm 10+
- Claude Code with Astrolabe plugin installed
- Local development setup: `claude --plugin-dir .`

## Validation Scenarios

### 1. Model/Skill Tab Renders

**Purpose**: Verify tab appears with all skills listed

```bash
# Start Claude Code with local plugin
claude --plugin-dir .

# In Claude Code:
# 1. Open pane (Ctrl+P or click pane area)
# 2. Navigate to Models tab (hotkey: 8)
# 3. Verify all skills listed with category, tier, model, effort
# 4. Verify columns: Skill, Category, Tier, Model, Effort
```

**Expected**: Tab loads <500ms, all ~30 skills visible, correct data

### 2. Auto Mode - Spec Kit Skill

**Purpose**: Verify auto mode routes Spec Kit skill to correct model

```bash
# In Config tab:
# 1. Set "Model per skill" to "auto"
# 2. Save
# 3. Run a Spec Kit skill (e.g., /specify "test feature")
# 4. Verify in Models tab: active skill highlighted, model = deep-reasoning tier
# 5. Check console: context re-read occurred
```

**Expected**: Skill uses deep-reasoning model, context re-read logged

### 3. Auto Mode - gstack Skill

**Purpose**: Verify auto mode routes gstack skill to correct model

```bash
# In Config tab:
# 1. skillModels = "auto"
# 2. Run a gstack skill (e.g., /benchmark)
# 3. Verify in Models tab: active skill highlighted, model = balanced-coding tier
```

**Expected**: Skill uses balanced-coding model

### 4. Off Mode

**Purpose**: Verify default model used when auto is off

```bash
# In Config tab:
# 1. Set "Model per skill" to "off"
# 2. Run any skill
# 4. Verify default model/effort used (no per-skill override)
```

**Expected**: No model override, default behavior

### 5. Active Skill Highlight

**Purpose**: Verify active skill highlighted in table

```bash
# 1. skillModels = "auto"
# 2. Start a long-running skill (e.g., /plan-ceo-review)
# 3. Open Models tab while skill runs
# 4. Verify skill row highlighted (different color/badge)
# 5. After completion, verify highlight removed
```

**Expected**: Active skill visually distinct, highlight clears after

## Expected Outcomes

| Scenario | Success Criteria |
|----------|------------------|
| Tab render | <500ms, all skills listed |
| Spec Kit auto | deep-reasoning model, context re-read |
| gstack auto | balanced-coding model |
| Off mode | Default model, no override |
| Highlight | Active skill visually distinct |

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Tab not visible | Check PANE_TABS in pane.tsx, register.tsx |
| Auto not working | Check turn.step hook, skillRunning variable |
| Wrong model | Check skill-model-map.ts tier assignments |
| No highlight | Check ModelSkillTabRow.isActive logic |
| Context not re-reading | Check turn.step hook modifies request correctly |