import { describe, expect, test } from 'claude-code/testing'

import { PRESETS, presetOf } from '../../hooks/core/presets'

describe('presets are data (FR-008)', () => {
  test('the three presets turn on the documented sites', () => {
    expect(PRESETS.minimal).toEqual({ status: true, band: false, hint: false, spinner: false, pane: 'command', toasts: 'none' })
    expect(PRESETS.compact).toEqual({ status: true, band: true, hint: true, spinner: true, pane: 'command', toasts: 'drift' })
    expect(PRESETS.full).toEqual({ status: true, band: true, hint: true, spinner: true, pane: 'auto', toasts: 'all' })
  })
  test('compact is the default, and an unknown value falls back to it', () => {
    expect(presetOf({})).toBe(PRESETS.compact)
    expect(presetOf({ preset: 'zen' })).toBe(PRESETS.compact)
    expect(presetOf({ preset: 'minimal' })).toBe(PRESETS.minimal)
  })
})
