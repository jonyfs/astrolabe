import { describe, expect, test } from 'claude-code/testing'

import { usageRamp } from '../../hooks/core/usage-ramp'

describe('one usage ramp (064 #1)', () => {
  test('below 60 is ok: done colour, no mark', () => {
    for (const percent of [0, 42, 59, 59.9]) {
      expect(usageRamp(percent)).toEqual({ level: 'ok', role: 'done', chip: 'green', mark: '', full: false })
    }
  })

  test('60 up to 80 is warn: yellow with ▵', () => {
    for (const percent of [60, 70, 79, 79.9]) {
      expect(usageRamp(percent)).toEqual({ level: 'warn', role: 'warn', chip: 'yellow', mark: '▵', full: false })
    }
  })

  test('80 and above is blocked: blocked colour with ▴', () => {
    for (const percent of [80, 81, 88, 99]) {
      expect(usageRamp(percent)).toEqual({ level: 'block', role: 'blocked', chip: 'red', mark: '▴', full: false })
    }
  })

  test('100 or more also prints full', () => {
    expect(usageRamp(100)).toEqual({ level: 'block', role: 'blocked', chip: 'red', mark: '▴', full: true })
    expect(usageRamp(130).full).toBe(true)
  })

  test('the hold threshold of a window moves the block level', () => {
    expect(usageRamp(69, { hold: 70 }).level).toBe('warn')
    expect(usageRamp(70, { hold: 70 }).level).toBe('block')
    expect(usageRamp(80, { hold: 90 }).level).toBe('warn')
  })

  test('a hold below 60 warns and blocks from the hold, with no inverted band', () => {
    expect(usageRamp(49, { hold: 50 }).level).toBe('ok')
    expect(usageRamp(50, { hold: 50 }).level).toBe('block')
    expect(usageRamp(55, { hold: 50 }).level).toBe('block')
  })

  test('an unknown percent has no colour level and no mark', () => {
    for (const percent of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(usageRamp(percent)).toEqual({ level: 'ok', role: 'done', chip: 'green', mark: '', full: false })
    }
  })
})
