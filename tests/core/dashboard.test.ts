import { describe, expect, test } from 'claude-code/testing'

import { toText } from '../../hooks/core/cells'
import { burnRate, dial, kpiRows, phaseBars, usageChart } from '../../hooks/core/dashboard'
import { FLAVORS } from '../../hooks/core/theme'

const T = FLAVORS.mocha
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const f = (dir: string, phase: string) => ({ id: dir.slice(0, 3), name: dir.slice(4), dir, phase, done: 0, total: 0, warnings: [] }) as never

describe('the astrolabe dial (018 FR-005)', () => {
  test('points at the active step; earlier steps are ticked', () => {
    const text = toText(dial('implement', T)).join('\n')
    expect(text).toContain('● implement')
    expect(text).toContain('✓ plan')
    expect(text).toContain('○ done')
    expect(text).toContain('↙')
    expect(toText(dial('specify', T)).join('\n')).toContain('↑')
  })
  test('no active feature: no needle, every step open', () => {
    const text = toText(dial(undefined, T)).join('\n')
    expect(text).not.toMatch(/[↑↗↘↓↙↖]/)
    expect(text).toContain('○ specify')
  })
})

describe('features by phase', () => {
  test('one bar per phase that has features, the count after it', () => {
    const g = phaseBars([f('001-a', 'done'), f('002-b', 'done'), f('003-c', 'implement')], 40, T)!
    const rows = toText(g).map(r => r.trimEnd())
    expect(rows.find(r => r.startsWith('done'))).toMatch(/█+ 2$/)
    expect(rows.find(r => r.startsWith('implement'))).toMatch(/█+ 1$/)
    expect(rows.some(r => r.startsWith('plan'))).toBe(false)
  })
  test('too narrow: none', () => {
    expect(phaseBars([f('001-a', 'done')], 15, T)).toBeUndefined()
  })
})

describe('usage over the session', () => {
  const series = Array.from({ length: 10 }, (_, i) => ({ at: NOW - (9 - i) * 6 * 60_000, percent: 40 + i * 2 }))
  test('burn rate in points per hour', () => {
    expect(Math.round(burnRate(series) ?? 0)).toBe(20)
    expect(burnRate(series.slice(0, 1))).toBeUndefined()
  })
  test('a chart with a y axis, the points, and the projection to the reset', () => {
    const g = usageChart(series, { width: 50, height: 6, resetsAt: new Date(NOW + 2 * 3600_000).toISOString(), now: NOW, tokens: T })!
    const rows = toText(g)
    expect(rows[0]).toMatch(/^100┤/)
    expect(rows.at(-1)).toMatch(/^ {2}0┼/)
    expect(rows.join('')).toContain('●')
    expect(rows.join('')).toContain('·')
  })
  test('no reading, or too narrow: none', () => {
    expect(usageChart([], { width: 50, height: 6, now: NOW, tokens: T })).toBeUndefined()
    expect(usageChart(series, { width: 20, height: 6, now: NOW, tokens: T })).toBeUndefined()
  })
})

describe('KPIs', () => {
  test('session counts, context, cost, duration, burn and projection', () => {
    const rows = kpiRows(
      { startedAt: NOW - 90 * 60_000, turns: 3, toolCalls: 12, drifts: 1, agentsRun: 2, agentsQueued: 1, context: { percent: 61 }, cost: 1.2, series: [{ at: NOW - 3600_000, percent: 40 }, { at: NOW, percent: 60 }] },
      { kind: 'five_hour', percent: 60, resetsAt: new Date(NOW + 3600_000).toISOString() },
      NOW,
    )
    const map = Object.fromEntries(rows)
    expect(map['turns']).toBe('3')
    expect(map['tool calls']).toBe('12')
    expect(map['drift alarms']).toBe('1')
    expect(map['subagents']).toBe('2 run, 1 queued')
    expect(map['context']).toBe('61%')
    expect(map['cost']).toBe('$1.20')
    expect(map['session']).toBe('1h30m')
    expect(map['burn rate']).toBe('20 points an hour')
    expect(map['at the reset']).toBe('5h about 80%')
  })
})

describe('the state the feature adds stays small (018 SC-005)', () => {
  test('a full session, 60 chart points and every field, is under 4 KB', () => {
    const stats = {
      startedAt: NOW, turns: 99_999, toolCalls: 999_999, drifts: 9_999, agentsRun: 9_999, agentsQueued: 9_999,
      model: 'claude-sonnet-5-5[1m]', effort: 'xhigh', context: { percent: 99.987654321 }, cost: 123.456789,
      git: { branch: 'feature/a-rather-long-branch-name-for-the-test', ahead: 999, behind: 999, changed: 9_999, conflicts: 99 },
      series: Array.from({ length: 60 }, (_, i) => ({ at: NOW + i * 600_000, percent: 99.123456789 })),
    }
    expect(JSON.stringify(stats).length).toBeLessThan(4096)
  })
})
