# Quickstart: Config Tab

**Feature**: 028-config-tab
**Date**: 2026-10-10

## Prerequisites

- Node.js 20+
- npm 10+
- Claude Code with Astrolabe plugin installed
- Local development setup: `claude --plugin-dir .`

## Validation Scenarios

### 1. Config Tab Renders Correctly

**Purpose**: Verify Config tab appears and displays all options

```bash
# Start Claude Code with local plugin
claude --plugin-dir .

# In Claude Code:
# 1. Open pane (Ctrl+P or click pane area)
# 2. Navigate to Config tab
# 3. Verify all userConfig options from plugin.json are shown
# 4. Verify each field shows current value as default
# 5. Verify field types match: text/number/boolean/select
```

**Expected**: Config tab loads <500ms, all options rendered with correct types

### 2. Modify String Option

**Purpose**: Verify string option editing and persistence

```bash
# In Config tab:
# 1. Find a string option (e.g., "theme")
# 2. Change value (e.g., "mocha" → "latte")
# 3. Click Save
# 4. Verify success message
# 5. Verify mod reloads
# 6. Reopen Config tab → verify new value persists
```

**Expected**: Save completes <1s, mod reloads, new value persisted

### 3. Modify Boolean Option

**Purpose**: Verify boolean (checkbox) option editing

```bash
# In Config tab:
# 1. Find a boolean option (e.g., "compactMode")
# 2. Toggle checkbox
# 3. Click Save
# 4. Verify mod reloads with new value
```

**Expected**: Checkbox toggles correctly, save works, reload applies change

### 4. Modify Enum Option

**Purpose**: Verify enum (select) option editing

```bash
# In Config tab:
# 1. Find an enum option (e.g., "theme" with values ["mocha","frappe","macchiato","latte"])
# 2. Select different value from dropdown
# 3. Click Save
# 5. Verify mod reloads with new value
```

**Expected**: Dropdown shows all enum values, selection persists

### 5. Validation - Invalid Number

**Purpose**: Verify number validation (min/max)

```bash
# In Config tab:
# 1. Find a number option with min/max (e.g., "maxItems" min=1 max=100)
# 2. Enter invalid value (e.g., 0 or 101)
# 3. Tab away from field (blur)
# 4. Verify error message shown inline
# 5. Click Save → verify Save disabled or shows error
# 6. Enter valid value (e.g., 50)
# 7. Click Save → verify success
```

**Expected**: Inline error on blur, Save blocked until valid

### 6. Validation - Wrong Type

**Purpose**: Verify type validation

```bash
# In Config tab:
# 1. Find a number option
# 2. Enter text ("abc")
# 3. Tab away → verify error
# 4. Enter valid number → verify error clears
```

**Expected**: Type mismatch shows error, clears on valid input

## Expected Outcomes

| Scenario | Success Criteria |
|----------|------------------|
| Tab render | <500ms, all options shown, correct types |
| String save | <1s total, reload, value persists |
| Boolean save | <1s total, reload, value persists |
| Enum save | <1s total, reload, value persists |
| Invalid number | Error on blur, Save blocked |
| Wrong type | Error on blur, clears on fix |

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Config tab not visible | Check `hooks/register.tsx` tab registration |
| Options missing | Verify plugin.json userConfig structure |
| Save doesn't persist | Check `$.config.set` call, console for errors |
| Mod doesn't reload | Verify config change triggers reload in engine |
| Validation not working | Check Zod schema derivation from plugin.json |