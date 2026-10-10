import { describe, expect, test } from 'claude-code/testing'

import { toText } from '../../hooks/core/cells'
import { burnRate, dial, kpiChips, kpiLines, kpiRows, phaseBars, trendRows, usageChart } from '../../hooks/core/dashboard'
import { clockOf } from '../../hooks/core/governor'
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
    const options = { width: 50, height: 6, resetsAt: new Date(NOW + 2 * 3600_000).toISOString(), now: NOW, tokens: T }
    const g = usageChart(series, options)!
    const rows = toText(g)
    expect(rows[0]).toMatch(/^100%┤/)
    expect(rows[4]).toMatch(/^ {2}0%┼/)
    expect(rows[5]?.slice(0, 5)).toBe(clockOf(new Date(series[0]!.at).toISOString()))
    expect(rows[5]?.trimEnd().slice(-5)).toBe(clockOf(new Date(series.at(-1)!.at).toISOString()))
    expect(rows.join('')).toContain('●')
    expect(rows.join('')).toContain('·')
    expect(usageChart(series, options)).toBe(g)
  })
  test('no reading, or too narrow: none', () => {
    expect(usageChart([], { width: 50, height: 6, now: NOW, tokens: T })).toBeUndefined()
    expect(usageChart(series, { width: 20, height: 6, now: NOW, tokens: T })).toBeUndefined()
  })
})

describe('KPIs', () => {
  test('session counts, context, duration, burn and projection; no cost (054)', () => {
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
    expect(map['cost']).toBeUndefined()
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

describe('trendRows (046 #53, #57)', () => {
  test('a sparkline per window and for the context, once two readings carry it', () => {
    const series = [
      { at: 1, percent: 40, fiveHour: 20, sevenDay: 40, context: 10 },
      { at: 2, percent: 50, fiveHour: 50, sevenDay: 50 },
      { at: 3, percent: 60, fiveHour: 100, sevenDay: 60, context: 30 },
    ]
    expect(trendRows(series)).toEqual([
      ['5h', '▂▅█ 100%'],
      ['7d', '▄▅▅ 60%'],
      ['context', '▂▃ 30%'],
    ])
    expect(trendRows([{ at: 1, percent: 10 }])).toEqual([])
  })
})

describe('pace KPIs (054 #31, #33)', () => {
  test('tasks an hour and turns a task, once a task is ticked', () => {
    const NOW2 = Date.UTC(2026, 9, 8, 12)
    const base = { startedAt: NOW2 - 2 * 3_600_000, turns: 9, toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, series: [] }
    const map = Object.fromEntries(kpiRows({ ...base, turnTicks: [{ ms: 1, n: 2 }, { ms: 1, n: 1 }] }, undefined, NOW2))
    expect(map['tasks an hour']).toBe('1.5 tasks an hour')
    expect(map['turns a task']).toBe('3.0')
    expect(Object.fromEntries(kpiRows(base, undefined, NOW2))['turns a task']).toBeUndefined()
  })
})

describe('context a task (054 #34)', () => {
  test('the context points used, freed ones included, over the tasks ticked', () => {
    const NOW2 = Date.UTC(2026, 9, 8, 12)
    const base = { startedAt: NOW2 - 3_600_000, turns: 4, toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, series: [{ at: 1, percent: 10, context: 12 }], turnTicks: [{ ms: 1, n: 4 }] }
    // From 12% to 40%, plus 20 points a compaction freed: 48 points over 4 tasks.
    const map = Object.fromEntries(kpiRows({ ...base, context: { percent: 40 }, compactions: { n: 1, freed: 20 } }, undefined, NOW2))
    expect(map['context a task']).toBe('12.0% of the window')
    expect(Object.fromEntries(kpiRows({ ...base, turnTicks: [] , context: { percent: 40 } }, undefined, NOW2))['context a task']).toBeUndefined()
    expect(Object.fromEntries(kpiRows({ ...base, series: [], context: { percent: 40 } }, undefined, NOW2))['context a task']).toBeUndefined()
  })
})

describe('no rows of zeros (054 #70)', () => {
  test('drift alarms and subagents show only once there is one', () => {
    const base = { startedAt: 0, turns: 1, toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, series: [] }
    const labels = kpiRows(base, undefined, 1).map(([label]) => label)
    expect(labels).not.toContain('drift alarms')
    expect(labels).not.toContain('subagents')
    expect(labels).toContain('turns')
  })
})

describe('drift alarms per feature (054 #35)', () => {
  test('the total, then each feature, most first', () => {
    const base = { startedAt: 0, turns: 1, toolCalls: 0, drifts: 3, agentsRun: 0, agentsQueued: 0, series: [] }
    expect(Object.fromEntries(kpiRows(base, undefined, 1))['drift alarms']).toBe('3')
    expect(Object.fromEntries(kpiRows({ ...base, driftsByFeature: { '004': 1, '002': 2 } }, undefined, 1))['drift alarms']).toBe('3 (002: 2, 004: 1)')
  })
})

describe('the first row (054 #23)', () => {
  test('adds where the deciding window lands at its reset', () => {
    const NOW3 = Date.UTC(2026, 9, 8, 12)
    const stats = { startedAt: NOW3 - 3_600_000, turns: 1, toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, series: [{ at: NOW3 - 3_600_000, percent: 40 }, { at: NOW3, percent: 50 }] }
    const chips = kpiChips(stats, undefined, 'en', { kind: 'five_hour', percent: 50, resetsAt: new Date(NOW3 + 2 * 3_600_000).toISOString() }, NOW3)
    expect(chips.map(c => c.text)).toContain('5h at reset 70%')
  })
})

describe('compactions (054 #38)', () => {
  test('count and points freed', () => {
    const NOW4 = Date.UTC(2026, 9, 8, 12)
    const map = Object.fromEntries(kpiRows({ startedAt: NOW4, turns: 1, toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, series: [], compactions: { n: 2, freed: 120 } }, undefined, NOW4))
    expect(map['compactions']).toBe('2, 120 points of context freed')
  })
})

describe('time waited on the governor (054 #36)', () => {
  test('shown once there was a wait', () => {
    const NOW5 = Date.UTC(2026, 9, 8, 12)
    const base = { startedAt: NOW5, turns: 1, toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, series: [] }
    expect(Object.fromEntries(kpiRows({ ...base, waitedMs: 12 * 60_000 }, undefined, NOW5))['waited on governor']).toBe('12m')
    expect(Object.fromEntries(kpiRows(base, undefined, NOW5))['waited on governor']).toBeUndefined()
  })
})

describe('kpiLines (052 #32)', () => {
  const kpis: Array<[string, string]> = [['turns', '12'], ['tool calls', '40'], ['drifts', '0']]
  test('under 100 columns one row each', () => {
    expect(kpiLines(kpis, 99, 10)).toEqual(['turns     12', 'tool calls40', 'drifts    0'])
  })
  test('from 100 columns two to a line, in reading order, the last one alone', () => {
    const lines = kpiLines(kpis, 100, 10)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(`${'turns     12'.padEnd(50)}tool calls40`)
    expect(lines[1]).toBe('drifts    0')
  })
})
