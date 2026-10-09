import { describe, expect, test } from 'claude-code/testing'

import { addDay, addWeek, estimateLeft, lastWeeks, pastReset, slowest, updateFeatureDurations, weekdays, weekKey } from '../../hooks/core/history'

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

describe('pastReset (045 #50)', () => {
  const times = [{ dir: 'd', id: 'T001', ms: 30 * 60_000 }]
  const NOW = Date.UTC(2026, 9, 7, 12)
  test('the time left when the open tasks end after the reset', () => {
    expect(pastReset(times, 'd', 11, new Date(NOW + 3_600_000).toISOString(), NOW)).toBe(11 * 30 * 60_000)
  })
  test('nothing when they end before it, or with no pace or reset', () => {
    expect(pastReset(times, 'd', 1, new Date(NOW + 3_600_000).toISOString(), NOW)).toBeUndefined()
    expect(pastReset([], 'd', 11, new Date(NOW + 3_600_000).toISOString(), NOW)).toBeUndefined()
    expect(pastReset(times, 'd', 11, undefined, NOW)).toBeUndefined()
    expect(pastReset(times, 'd', 11, new Date(NOW - 1).toISOString(), NOW)).toBeUndefined()
  })
})

describe('feature durations (054 #32)', () => {
  const feature = (dir: string, phase: 'specify' | 'plan' | 'done') => ({ dir, id: dir.slice(0, 3), name: dir.slice(4), phase })

  test('measures from first seen in Specify until the feature is done, once', () => {
    const started = updateFeatureDurations({}, [feature('001-first', 'specify')], 100)
    expect(started.records['001-first']).toEqual({ dir: '001-first', id: '001', name: 'first', startedAt: 100 })
    expect(updateFeatureDurations(started.records, [feature('001-first', 'plan')], 150).changed).toBe(false)
    const done = updateFeatureDurations(started.records, [feature('001-first', 'done')], 250)
    expect(done.records['001-first']).toMatchObject({ startedAt: 100, completedAt: 250, ms: 150 })
    expect(updateFeatureDurations(done.records, [feature('001-first', 'done')], 300).changed).toBe(false)
  })

  test('does not infer a start for a feature first seen after Specify', () => {
    expect(updateFeatureDurations({}, [feature('002-later', 'plan'), feature('003-finished', 'done')], 100).records).toEqual({})
  })
})

describe('days (046 #54)', () => {
  test('adds per day, keeps 14, and lays this week out Monday first', () => {
    let d = {}
    for (let i = 1; i <= 20; i += 1) d = addDay(d, `2026-10-${String(i).padStart(2, '0')}`, 1)
    expect(Object.keys(d).length).toBe(14)
    d = addDay(d, '2026-10-07', 2)
    // 2026-10-07 is a Wednesday; the week runs 10-05 to 10-11, and 10-05 and 10-06 fell out of the 14 days.
    expect(weekdays(d, Date.UTC(2026, 9, 7, 12))).toEqual([0, 0, 3, 1, 1, 1, 1])
  })
})

describe('the last 8 weeks (054 #40)', () => {
  test('oldest first, 0 for a week with none', () => {
    const now = Date.UTC(2026, 9, 8)
    const weeks = { [weekKey(now)]: { tasks: 5, features: 1 }, [weekKey(now - 14 * 86_400_000)]: { tasks: 2, features: 0 } }
    expect(lastWeeks(weeks, now)).toEqual([0, 0, 0, 0, 0, 2, 0, 5])
  })
})
