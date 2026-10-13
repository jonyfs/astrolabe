import { describe, expect, test } from 'claude-code/testing'

import { deciderNote, governorBoxState, todayCounts, trend24h } from '../../hooks/core/session-usage'

const NOW = Date.UTC(2026, 9, 12, 12, 0)
const H = 3_600_000

describe('the deciding window note (071 FR-002)', () => {
  const history = [
    { at: NOW - 2 * H, percent: 70 },
    { at: NOW, percent: 81 },
  ]
  test('the next level before the reset, with the time at the recent pace', () => {
    const readings = [{ kind: 'seven_day', percentUsed: 81, resetsAt: new Date(NOW + 2 * 86_400_000).toISOString() }]
    const note = deciderNote(readings, history, NOW)
    expect(note).toMatch(/^stop 88% in ≈\d/)
  })
  test('none when the pace does not reach it before the reset', () => {
    const readings = [{ kind: 'seven_day', percentUsed: 81, resetsAt: new Date(NOW + 10 * 60_000).toISOString() }]
    expect(deciderNote(readings, history, NOW)).toBeUndefined()
  })
  test('none without a pace', () => {
    expect(deciderNote([{ kind: 'five_hour', percentUsed: 40 }], [], NOW)).toBeUndefined()
  })
})

describe('trend24h (071 FR-003)', () => {
  const series = (n: number) => Array.from({ length: n }, (_, i) => ({ at: NOW - (n - 1 - i) * H, percent: 10 + i * 2 }))
  test('one block per hour, then dashes to the reset, then the label', () => {
    const row = trend24h({ series: series(24), now: NOW, resetsAt: new Date(NOW + 6 * H).toISOString() })
    expect(row).toBeDefined()
    expect(row!).toMatch(/^[▁▂▃▄▅▆▇█]{24}┄{1,8} {2}now → reset$/)
  })
  test('without a pace or a reset there are no dashes', () => {
    const flat = Array.from({ length: 6 }, (_, i) => ({ at: NOW - (5 - i) * H, percent: 30 }))
    expect(trend24h({ series: flat, now: NOW })).toMatch(/^[▁▂▃▄▅▆▇█]{24} {2}now$/)
  })
  test('fewer than three readings draw nothing', () => {
    expect(trend24h({ series: series(2), now: NOW })).toBeUndefined()
  })
})

describe('governorBoxState (071 FR-004)', () => {
  const base = { band: 'ok' as const, queued: 0, override: false, lift: false }
  test('hidden when nothing acts', () => {
    expect(governorBoxState(base)).toEqual({ show: false, lift: false, revoke: false })
  })
  test('shown by a hold, a queue or an override', () => {
    expect(governorBoxState({ ...base, band: 'hold' })).toEqual({ show: true, lift: true, revoke: false })
    expect(governorBoxState({ ...base, queued: 2 })).toEqual({ show: true, lift: false, revoke: false })
    expect(governorBoxState({ ...base, override: true })).toEqual({ show: true, lift: false, revoke: true })
  })
  test('pause and ceiling offer the lift too', () => {
    expect(governorBoxState({ ...base, band: 'stop' }).lift).toBe(true)
    expect(governorBoxState({ ...base, band: 'ceiling' }).lift).toBe(true)
  })
})

describe('todayCounts', () => {
  test('counts holds and pauses from the log lines, never the answers', () => {
    const at = NOW - H
    const log = [
      { at, text: 'usage 7d 81% (hold): a new subagent, "Review". What now?' },
      { at, text: 'usage 5h 82% (hold): a new subagent, "Plan". What now?' },
      { at, text: 'usage 7d 90% (ceiling): Bash. What now?' },
      { at, text: '→ run T009 now' },
    ]
    expect(todayCounts(log, NOW - 2 * H)).toEqual({ holds: 2, pauses: 1 })
    expect(todayCounts([], 0)).toEqual({ holds: 0, pauses: 0 })
  })
})
