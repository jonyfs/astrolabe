import { describe, expect, test } from 'claude-code/testing'

import { addWeek, estimateLeft, slowest, weekKey } from '../../hooks/core/history'

describe('time per task and the estimate (021 #17, #18)', () => {
  const times = [
    { dir: '002-b', id: 'T001', ms: 10 * 60_000 },
    { dir: '002-b', id: 'T002', ms: 30 * 60_000 },
    { dir: '001-a', id: 'T009', ms: 90 * 60_000 },
  ]
  test('the slowest tasks of a feature', () => {
    expect(slowest(times, '002-b', 1)).toEqual([{ dir: '002-b', id: 'T002', ms: 30 * 60_000 }])
    expect(slowest(times, '003-c', 3)).toEqual([])
  })
  test('the average time of the feature times its open tasks', () => {
    expect(estimateLeft(times, '002-b', 6)).toBe(120 * 60_000)
    expect(estimateLeft(times, '003-c', 6)).toBeUndefined()
    expect(estimateLeft(times, '002-b', 0)).toBeUndefined()
  })
})

describe('weeks (021 #23)', () => {
  test('ISO week keys', () => {
    expect(weekKey(Date.UTC(2026, 9, 7))).toBe('2026-W41')
    expect(weekKey(Date.UTC(2027, 0, 1))).toBe('2026-W53')
  })
  test('counts add up, and only the last 12 weeks are kept', () => {
    let h = addWeek({}, '2026-W41', 3, 1)
    h = addWeek(h, '2026-W41', 2, 0)
    expect(h['2026-W41']).toEqual({ tasks: 5, features: 1 })
    for (let w = 1; w <= 20; w += 1) h = addWeek(h, `2027-W${String(w).padStart(2, '0')}`, 1, 0)
    expect(Object.keys(h).length).toBe(12)
    expect(h['2026-W41']).toBeUndefined()
  })
})
