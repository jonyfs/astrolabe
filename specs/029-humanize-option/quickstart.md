# Quickstart: Humanize Option

**Feature**: 029-humanize-option
**Date**: 2026-10-10

## Prerequisites

- Node.js 20+
- npm 10+
- Claude Code with Astrolabe plugin installed (spec 028 Config tab required)
- Local development setup: `claude --plugin-dir .`

## Validation Scenarios

### 1. Humanize Option Appears in Config Tab

**Purpose**: Verify the option is rendered correctly

```bash
# Start Claude Code with local plugin
claude --plugin-dir .

# In Claude Code:
# 1. Open pane (Ctrl+P or click pane area)
# 2. Navigate to Config tab (hotkey: 6)
# 3. Find "Humanize" option
# 4. Verify: checkbox, label "Write like a person", description mentions humanizer rules
```

**Expected**: Option visible, type=checkbox, default unchecked

### 2. Enable Humanize Option

**Purpose**: Verify rules are injected into system prompt

```bash
# In Config tab:
# 1. Check "Humanize" checkbox
# 2. Click Save
# 3. Verify mod reloads (toast or status change)
# 4. Open a new conversation or ask Claude something
# 5. Verify response follows humanizer rules (plain prose, no hype, active voice, etc.)
```

**Expected**: Save completes <1s, mod reloads, responses follow humanizer style

### 3. Disable Humanize Option

**Purpose**: Verify rules are removed from system prompt

```bash
# In Config tab:
# 1. Uncheck "Humanize" checkbox
# 2. Click Save
# 3. Verify mod reloads
# 4. Ask Claude something
# 5. Verify response no longer constrained by humanizer rules
```

**Expected**: Save completes <1s, mod reloads, responses return to normal style

### 4. Persistence Across Reload

**Purpose**: Verify option value persists

```bash
# 1. Enable Humanize, Save
# 2. Restart Claude Code (or run /reload-plugins)
# 3. Open Config tab
# 4. Verify Humanize is still checked
```

**Expected**: Option remains enabled after reload

## Expected Outcomes

| Scenario | Success Criteria |
|----------|------------------|
| Option visible | Checkbox in Config tab, correct label/description |
| Enable | Rules injected, responses follow humanizer style |
| Disable | Rules removed, responses normal |
| Persistence | Value survives reload/restart |

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Option not visible | Check plugin.json userConfig has humanize option |
| Rules not injected | Check prompt.compose hook reads config |
| Save fails | Check $.config.set call, console for errors |
| Mod doesn't reload | Verify config change triggers reload in engine |