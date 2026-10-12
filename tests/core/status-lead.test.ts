import { describe, expect, test } from 'claude-code/testing'

import { statusLead } from '../../hooks/core/status-lead'
import type { Decision } from '../../hooks/core/governor'
import type { Feature, SpeckitState } from '../../hooks/core/types'

const NOW = Date.UTC(2026, 9, 12, 12, 0)
const feature = (over: Partial<Feature> = {}): Feature =>
  ({ id: '002', name: 'shopping-cart', dir: '002-shopping-cart', phase: 'implement', done: 9, total: 20, warnings: [], ...over }) as Feature
const state = (f: Feature | null = feature(), over: Partial<SpeckitState> = {}): SpeckitState =>
  ({
    present: true,
    root: '/proj',
    constitution: 'ratified',
    features: f === null ? [] : [f],
    ...(f === null ? {} : { active: { dir: f.dir, id: f.id, name: f.name, source: 'feature.json' } }),
    isAnalyzed: false,
    ...over,
  }) as SpeckitState
const reset = new Date(NOW + 3 * 86_400_000).toISOString()
const hold: Decision = { band: 'hold', cap: 0, highest: { kind: 'seven_day', percent: 81, resetsAt: reset } }
const clock = (() => {
  const d = new Date(reset)
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})()

describe('the status entry lead (065 #15, board 2)', () => {
  test('200 and 144 columns: feature, phase, percentage, the deciding window and its reset', () => {
    for (const columns of [200, 144]) {
      expect(statusLead(state(), hold, columns, NOW)).toBe(`◆ 002 implement 45% │ 7d 81%▴ hold · ${clock}`)
    }
  })
  test('100 columns: the phase shortens and the reset goes', () => {
    expect(statusLead(state(), hold, 100, NOW)).toBe('◆ 002 impl 45% │ 7d 81%▴ hold')
  })
  test('80 columns: no phase', () => {
    expect(statusLead(state(), hold, 80, NOW)).toBe('◆ 002 45% │ 7d 81%▴ hold')
  })
  test('the id and the deciding window are never dropped', () => {
    for (let columns = 16; columns <= 200; columns += 1) {
      const text = statusLead(state(), hold, columns, NOW)
      expect(text === '' || text.includes('◆ 002')).toBe(true)
      // The id and the window do not drop: under their own width the engine cuts the line.
      if (columns >= [...'◆ 002 │ 7d 81%▴ hold'].length) expect([...text].length <= columns).toBe(true)
    }
    expect(statusLead(state(), hold, 24, NOW)).toContain('7d 81%▴')
  })
  test('no readings: the feature alone; a guessed feature carries ~', () => {
    expect(statusLead(state(), undefined, 200, NOW)).toBe('◆ 002 implement 45%')
    expect(statusLead(state(null), undefined, 200, NOW)).toBe('◆ no active feature')
    expect(statusLead(state(feature(), { activeWarning: 'feature-json-dangling' } as never), undefined, 200, NOW)).toBe('◆ ~002 implement 45%')
  })
  test('a window that is ok shows its figure without a band word', () => {
    const ok: Decision = { band: 'ok', cap: 6, highest: { kind: 'five_hour', percent: 42, resetsAt: new Date(NOW + 2 * 3_600_000 + 9 * 60_000).toISOString() } }
    expect(statusLead(state(), ok, 200, NOW)).toBe('◆ 002 implement 45% │ 5h 42% · 2h09m')
  })
})
