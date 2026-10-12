import { describe, expect, test } from 'claude-code/testing'

import { blockLabel, blocksOf, checksLine, checksOf, countsOf, countsText, groupKeyOf, jumpLine, jumpMatches, jumpQuery, loadingRuns, nextGroup, runLabel } from '../../hooks/core/specs-scale'
import type { Feature } from '../../hooks/core/types'

const f = (id: string, phase: Feature['phase'] = 'done', done = 0, total = 0, over: Partial<Feature> = {}): Feature =>
  ({ id, name: `n${id}`, dir: `${id}-n${id}`, phase, done, total, warnings: [], ...over }) as Feature

describe('blocks of 50 by id (067 #31)', () => {
  test('ids 1 to 50, 51 to 100, and 4-digit ids', () => {
    expect(blockLabel('001')).toBe('001–050')
    expect(blockLabel('050')).toBe('001–050')
    expect(blockLabel('051')).toBe('051–100')
    expect(blockLabel('140')).toBe('101–150')
    expect(blockLabel('1001', 4)).toBe('1001–1050')
    expect(blockLabel('x')).toBe('?')
  })
  test('blocksOf groups in id order', () => {
    const blocks = blocksOf([f('052'), f('001'), f('049'), f('120')])
    expect(blocks.map(b => [b.label, b.features.map(x => x.id)])).toEqual([['001–050', ['001', '049']], ['051–100', ['052']], ['101–150', ['120']]])
  })
  test('counts and their text: ✓ done, ▶ in progress, · early, ▲ checks', () => {
    const features = [f('001'), f('002'), f('003', 'implement', 1, 5), f('004', 'specify'), f('005', 'plan'), f('006', 'implement', 4, 4)]
    const c = countsOf(features, '003-n003', new Set(['006-n006']))
    expect(c).toEqual({ done: 2, progress: 2, early: 2, checks: 1, total: 6 })
    expect(countsText(c)).toBe('✓2 ▶2 ·2 ▲1')
    expect(countsText({ done: 0, progress: 0, early: 0, checks: 0, total: 0 })).toBe('')
  })
})

describe('checks (067 #32, #33, #34)', () => {
  test('a done spec with open tasks, a duplicated id, a dangling feature.json', () => {
    const features = [f('028', 'done', 1, 30), f('029'), f('029', 'done', 0, 0, { dir: '029-other' }), f('030'), f('030', 'done', 0, 0, { dir: '030-other' })]
    const checks = checksOf({ features, activeWarning: 'feature-json-dangling' })
    expect(checks.filter(c => c.kind === 'done-open').map(c => c.text)).toEqual(['028 done with 1/30 ticked'])
    expect(checks.filter(c => c.kind === 'duplicate-id').map(c => c.id).sort()).toEqual(['029', '029', '030', '030'])
    expect(checks.some(c => c.kind === 'feature-json')).toBe(true)
  })
  test('the line sums them up', () => {
    const features = [f('028', 'done', 1, 30), f('029'), f('029', 'done', 0, 0, { dir: '029-other' }), f('030'), f('030', 'done', 0, 0, { dir: '030-other' })]
    expect(checksLine(checksOf({ features }))).toBe('▲ 3 checks · 028 done with 1/30 ticked · ids 029 and 030 used twice')
    expect(checksLine([])).toBeUndefined()
  })
  test('files plan.md names that are not there', () => {
    const checks = checksOf({ features: [f('003', 'plan')] }, { '003-n003': ['src/orders/api.ts'] })
    expect(checks.map(c => c.text)).toEqual(['003 plan.md names a missing file: src/orders/api.ts'])
  })
  test('a clean project has none', () => {
    expect(checksOf({ features: [f('001'), f('002', 'implement', 1, 4)] })).toEqual([])
  })
})

describe('placeholder runs for specs not read yet (067 #36)', () => {
  test('consecutive loading specs make one run', () => {
    const loading = (id: string) => f(id, 'specify', 0, 0, { warnings: ['loading'] })
    const runs = loadingRuns([f('038'), loading('040'), loading('041'), loading('042'), f('043'), loading('044')])
    expect(runs.map(runLabel)).toEqual(['040–042', '044'])
  })
})

describe('grouping cycles (067 #39)', () => {
  test('status, phase, track, priority, and round', () => {
    expect(['status', 'phase', 'track', 'priority', 'status'].map((_, i, a) => a[i])).toBeDefined()
    expect(nextGroup(undefined)).toBe('phase')
    expect(nextGroup('phase')).toBe('track')
    expect(nextGroup('track')).toBe('priority')
    expect(nextGroup('priority')).toBe('status')
  })
  test('a feature falls in the group of its phase, track or priority', () => {
    const feature = f('002', 'plan', 0, 0, { track: 'quick' })
    expect(groupKeyOf('phase', feature, undefined, undefined)).toBe('plan')
    expect(groupKeyOf('track', feature, undefined, undefined)).toBe('quick')
    expect(groupKeyOf('priority', feature, undefined, 'high')).toBe('high')
    expect(groupKeyOf('status', feature, undefined, undefined)).toBe('next')
  })
})

describe('the # jump (067 #31)', () => {
  const list = Array.from({ length: 60 }, (_, i) => f(String(i + 1).padStart(3, '0')))
  test('only a leading # is a jump', () => {
    expect(jumpQuery('#05')).toBe('05')
    expect(jumpQuery(' # 05 ')).toBe('05')
    expect(jumpQuery('phase:plan')).toBeUndefined()
    expect(jumpQuery(undefined)).toBeUndefined()
  })
  test('ids complete live: # 05 gives 050 to 059', () => {
    expect(jumpMatches(list, '05').map(x => x.id)).toEqual(['050', '051', '052', '053', '054', '055', '056', '057', '058', '059'])
    expect(jumpMatches(list, '05', 3).map(x => x.id)).toEqual(['050', '051', '052'])
    expect(jumpLine(list, '05')).toBe('# 05 → 050 051 … 059')
    expect(jumpLine(list, '9')).toBe('# 9 → ?')
  })
  test('both folders of a duplicated id are listed', () => {
    const both = [f('029'), f('029', 'done', 0, 0, { dir: '029-other' })]
    expect(jumpMatches(both, '029').map(x => x.dir)).toEqual(['029-n029', '029-other'])
  })
})
