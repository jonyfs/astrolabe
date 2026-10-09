import { describe, expect, test } from 'claude-code/testing'

import { formatToast } from '../../hooks/core/toasts'

describe('toast format (052 #44)', () => {
  test('always starts with one compass and keeps short messages intact', () => {
    expect(formatToast('Saved', 'full text in /astrolabe → Session')).toEqual({ text: '🧭 Saved' })
    expect(formatToast('🧭 Saved', 'full text in /astrolabe → Session')).toEqual({ text: '🧭 Saved' })
  })
  test('shortens long messages below 120 characters and keeps the full text', () => {
    const full = `🧭 ${'very long details '.repeat(12).trim()}`
    const result = formatToast(full, 'full text in /astrolabe → Session')
    expect(result.text.startsWith('🧭 ')).toBe(true)
    expect(result.text.length < 120).toBe(true)
    expect(result.text).toContain('full text in /astrolabe → Session')
    expect(result.full).toBe(full)
  })
})
