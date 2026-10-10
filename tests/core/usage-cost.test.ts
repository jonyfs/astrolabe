import { describe, expect, test } from 'claude-code/testing'

import { sparkline } from '../../hooks/core/dashboard'
import { labelOf, paceRow } from '../../hooks/core/governor'

const NOW = Date.UTC(2026, 9, 7, 12, 0)

describe('per-model windows (022 #29)', () => {
  test('window kinds read short', () => {
    expect(labelOf('five_hour')).toBe('5h')
    expect(labelOf('seven_day')).toBe('7d')
    expect(labelOf('seven_day_opus')).toBe('7d opus')
    expect(labelOf('seven_day_fable')).toBe('7d fable')
    expect(labelOf('monthly_spend')).toBe('monthly spend')
  })
})

describe('the band sparkline (022 #25)', () => {
  test('one block per point, low to high', () => {
    expect(sparkline([0, 50, 100])).toBe('▁▅█')
    expect(sparkline([40, 40, 40])).toBe('▄▄▄')
    expect(sparkline([])).toBe('')
  })
})

describe('the pace in words (022 #32)', () => {
  test('where the deciding window should be at its reset', () => {
    const history = [{ at: NOW - 3600_000, percent: 70 }, { at: NOW, percent: 80 }]
    const reading = { kind: 'seven_day', percentUsed: 80, resetsAt: new Date(NOW + 2 * 3600_000).toISOString() }
    expect(paceRow([reading], history, NOW)).toMatch(/^at this pace 7d reaches about 100% by \d\d:\d\d, in \d+(h\d\d)?m$/)
    expect(paceRow([reading], [], NOW)).toBeUndefined()
  })
})
