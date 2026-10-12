import { describe, expect, test } from 'claude-code/testing'

import { duration, resetIn } from '../../hooks/core/duration'

const NOW = Date.UTC(2026, 9, 12, 12, 0)
const at = (ms: number) => new Date(NOW + ms).toISOString()

describe('one duration format (064 #5)', () => {
  test('seconds, minutes with seconds, hours with minutes', () => {
    expect(duration(0)).toBe('0s')
    expect(duration(40_000)).toBe('40s')
    expect(duration(59_999)).toBe('59s')
    expect(duration(252_000)).toBe('4m12s')
    expect(duration(245_000)).toBe('4m05s')
    expect(duration(7_740_000)).toBe('2h09m')
    expect(duration(3_600_000)).toBe('1h00m')
  })

  test('whole minutes drop the zero seconds', () => {
    expect(duration(60_000)).toBe('1m')
    expect(duration(59 * 60_000)).toBe('59m')
  })

  test('unknown and negative are ?', () => {
    expect(duration(undefined)).toBe('?')
    expect(duration(Number.NaN)).toBe('?')
    expect(duration(-1)).toBe('?')
  })
})

describe('a reset reads one way (064 #5)', () => {
  test('under a day it counts down', () => {
    expect(resetIn(at(2 * 3_600_000 + 9 * 60_000), NOW)).toBe('2h09m')
    expect(resetIn(at(4 * 60_000 + 12_000), NOW)).toBe('4m12s')
  })

  test('beyond a day it names the weekday and time', () => {
    const iso = at(3 * 86_400_000)
    const d = new Date(iso)
    const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    expect(resetIn(iso, NOW)).toBe(`${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${clock}`)
  })

  test('missing, malformed or past is ?', () => {
    expect(resetIn(undefined, NOW)).toBe('?')
    expect(resetIn('not a date', NOW)).toBe('?')
    expect(resetIn(at(-1000), NOW)).toBe('?')
  })
})
