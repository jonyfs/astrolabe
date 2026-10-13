import { describe, expect, test } from 'claude-code/testing'

import { bandPr, bandSegments, bandText, nextReason, otherFeaturesCard } from '../../hooks/core/band'
import type { Feature, Phase, SpeckitState } from '../../hooks/core/types'

const feature = (phase: Phase, done = 14, total = 31, over: Partial<Feature> = {}): Feature => ({
  id: '002',
  name: 'band-hint',
  dir: '002-band-hint',
  phase,
  done,
  total,
  warnings: [],
  ...over,
})

const state = (f: Feature | null, over: Partial<SpeckitState> = {}): SpeckitState => ({
  present: true,
  root: '/proj',
  constitution: 'ratified',
  features: f ? [f] : [],
  ...(f ? { active: { dir: f.dir, id: f.id, name: f.name, source: 'feature.json' as const } } : {}),
  isAnalyzed: false,
  ...over,
})

const width = (s: string) => [...s].length

const at = (s: SpeckitState, columns = 200, extras: Parameters<typeof bandSegments>[2] = {}) => bandText(bandSegments(s, columns, extras))

describe('one row (065 #12, board 1 and 2)', () => {
  const impl = state(feature('implement', 9, 20, { dir: '002-band-hint' }), { currentTask: { id: 'T011', text: 'Show an empty-cart message' } as never })

  test('200 columns: id chip, name, steps, step chip, bar, task', () => {
    expect(at(impl, 200)).toBe(' 002  band-hint  ✓ specify ✓ clarify ✓ plan ✓ tasks  ▶ implement 9/20  ━━━━━━━━━━━━━━━━━━━━ 45%  │ ▸ T011 Show an empty-cart message')
  })
  test('144 columns: shorter bar, the title is cut', () => {
    const text = at(impl, 144)
    expect(text.startsWith(' 002  band-hint  ✓ specify ✓ clarify ✓ plan ✓ tasks  ▶ implement 9/20  ━━━━━━━━━━━━━ │ ▸ T011')).toBe(true)
  })
  test('100 columns: marks only, no percentage', () => {
    expect(at(impl, 100)).toBe(' 002  band-hint  ✓✓✓✓  ▶ implement 9/20  ━━━━━━━━━ │ ▸ T011')
  })
  test('80 columns: id, marks, step chip and the task id', () => {
    expect(at(impl, 80)).toBe(' 002  ✓✓✓✓  ▶ implement 9/20  │ ▸ T011')
  })
  test('the percentage appears only from 200 columns (board 2)', () => {
    expect(at(impl, 199)).not.toContain('45%')
    expect(at(impl, 144)).not.toContain('45%')
    expect(at(impl, 200)).toContain('45%')
  })
  test('the constitution step shows only when it is not ratified', () => {
    expect(at(impl, 200)).not.toContain('constitution')
    expect(at(state(feature('plan', 0, 0), { constitution: 'template' }), 200)).toContain('constitution')
  })
  test('drop order: title, then step names, then the name, then the bar', () => {
    const has = (columns: number, part: string) => at(impl, columns).includes(part)
    // 144: step names and a cut title; below it only the marks and no title.
    expect(has(144, '✓ specify')).toBe(true)
    expect(has(143, '✓ specify')).toBe(false)
    expect(has(143, 'band-hint')).toBe(true)
    expect(has(100, '━━━━')).toBe(true)
    // Below 100 columns the name goes, then the bar.
    expect(has(99, 'band-hint')).toBe(false)
    expect(has(99, '━')).toBe(false)
    expect(has(60, '▶ implement 9/20')).toBe(true)
    expect(has(60, '▸ T011')).toBe(true)
  })
  test('the id, the step chip and n/m never drop while there is room for them', () => {
    for (let columns = 24; columns <= 200; columns += 1) {
      const text = at(impl, columns)
      expect(width(text) <= columns).toBe(true)
      expect(text.includes(' 002 ')).toBe(true)
    }
  })
  test('the right-edge buttons take room from the left side', () => {
    const plain = at(impl, 100)
    const reserved = at(impl, 100, { reserved: 45 })
    expect(width(reserved)).toBeLessThanOrEqual(55)
    expect(width(reserved)).toBeLessThan(width(plain))
  })
})

describe('segments carry chips, links and roles (065)', () => {
  const impl = state(feature('implement', 9, 20, { dir: '002-band-hint' }), {})
  test('the id and the step are chips; finished steps link their files', () => {
    const segments = bandSegments(impl, 200)
    expect(segments.find(s => s.key === 'id')).toMatchObject({ chip: true, role: 'accent', href: 'specs/002-band-hint/spec.md' })
    expect(segments.find(s => s.key === 'chip-step')).toMatchObject({ chip: true, role: 'current' })
    expect(segments.find(s => s.key === 'mark-plan')?.href).toBe('specs/002-band-hint/plan.md')
    expect(segments.find(s => s.key === 'mark-tasks')?.href).toBe('specs/002-band-hint/tasks.md')
    expect(segments.find(s => s.key === 'label-specify')?.href).toBe('specs/002-band-hint/spec.md')
  })
  test('finished steps are done-coloured, the bar fill follows the share left', () => {
    const segments = bandSegments(impl, 200)
    expect(segments.find(s => s.key === 'mark-specify')).toMatchObject({ text: '✓', role: 'done' })
    expect(segments.find(s => s.key === 'bar-fill')?.role).toBe('barFill')
  })
})

describe('quick track (065 #11)', () => {
  const quick = state(feature('implement', 3, 5, { track: 'quick', dir: '010-small' }), {})
  test('draws spec, tasks and impl, never clarify or plan', () => {
    const text = at(quick, 200)
    expect(text).toContain('✓ spec')
    expect(text).toContain('✓ tasks')
    expect(text).toContain('▶ impl 3/5')
    expect(text).not.toMatch(/clarify|plan/)
  })
  test('a quick spec without tasks yet is on the tasks step', () => {
    const text = at(state(feature('implement', 0, 0, { track: 'quick', dir: '010-small' }), {}), 200)
    expect(text).toContain('✓ spec')
    expect(text).toContain('▶ tasks')
    expect(text).not.toContain('impl')
  })
})

describe('governor takeover (065 #13)', () => {
  const impl = state(feature('implement', 9, 20, { dir: '002-band-hint' }), { currentTask: { id: 'T011', text: 'Show' } as never })
  test('pause replaces the task with a blocked text and a lift action', () => {
    const segments = bandSegments(impl, 200, { governor: { band: 'stop', until: '07:00' } })
    expect(bandText(segments)).toContain('‖ paused until 07:00')
    expect(bandText(segments)).not.toContain('T011')
    expect(segments.find(s => s.key === 'paused')?.role).toBe('blocked')
    expect(segments.find(s => s.key === 'lift')).toMatchObject({ action: 'lift', text: 'lift 1h' })
  })
  test('hold says it is holding new subagents', () => {
    const text = at(impl, 200, { governor: { band: 'hold' } })
    expect(text).toContain('‖ holding new subagents')
    expect(text).not.toContain('lift 1h')
  })
  test('ok shows the task', () => {
    expect(at(impl, 200, { governor: { band: 'ok' } })).toContain('T011')
  })
})

describe('counts, not names (065 #16)', () => {
  test('the band shows counts of agents and gates only', () => {
    const impl = state(feature('implement', 9, 20, { dir: '002-band-hint' }), {})
    const text = at(impl, 200, { live: { agents: 3, gates: 3 } })
    expect(text).toContain('3 agents · 3 gates')
  })
  test('nothing live draws nothing', () => {
    const impl = state(feature('implement', 9, 20, { dir: '002-band-hint' }), {})
    expect(at(impl, 200, { live: { agents: 0, gates: 0 } })).not.toContain('agents')
  })
})

describe('other states (042, 065)', () => {
  test('a clarification left after the plan turns the step chip into a blocked ? clarify n chip', () => {
    const f = feature('implement', 0, 4, { warnings: ['clarification-after-plan'], clarifications: 2, dir: '002-band-hint' })
    const segments = bandSegments(state(f), 200)
    const chip = segments.find(s => s.key === 'chip-step')
    expect(chip).toMatchObject({ role: 'blocked' })
    expect(chip?.text).toBe(' ? clarify 2 ')
  })
  test('abandoned says so instead of a rail', () => {
    expect(at(state(feature('abandoned', 0, 3)), 200)).toBe(' 002  band-hint  abandoned')
  })
  test('a guessed feature carries ~', () => {
    expect(at(state(feature('plan', 0, 0), { activeWarning: 'feature-json-dangling' }), 200)).toMatch(/^ ~002 /)
  })
  test('the running step gets …', () => {
    expect(at(state(feature('plan', 0, 0), { runningSkill: { name: 'speckit-plan', step: 'plan' } }), 200)).toContain('▶ plan …')
  })
  test('nothing to draw without Spec Kit or an active feature', () => {
    expect(at({ present: false, constitution: 'missing', features: [], isAnalyzed: false } as unknown as SpeckitState, 200)).toBe('')
    expect(at(state(null), 200)).toBe('')
  })
  test('minimal is the 80-column row at any width, and the deciding window follows it', () => {
    const impl = state(feature('implement', 9, 20, { dir: '002-band-hint' }), { currentTask: { id: 'T011', text: 'Show' } as never })
    expect(at(impl, 200, { density: 'minimal' })).toBe(at(impl, 80))
    const idle = at(impl, 200, { density: 'minimal', deciding: { text: '7d 81%▴ hold', role: 'blocked' } })
    expect(idle).toBe(`${at(impl, 80)}  7d 81%▴ hold`)
  })
  test('a +N badge for other features and the worktree the active one runs in (042 #17, #18)', () => {
    const impl = state(feature('implement', 9, 20, { dir: '002-band-hint' }), {})
    const withOthers = { ...impl, features: [...impl.features, feature('plan', 0, 0, { id: '003', name: 'other', dir: '003-other' })] } as SpeckitState
    expect(at(withOthers, 200)).toContain('+1')
    expect(at(impl, 200, { worktree: 'wt-cart' })).toContain('⑂ wt-cart')
  })
})

describe('band, part two (042)', () => {
  const other = { id: '003', name: 'other', dir: '003-other', phase: 'plan' as const, done: 0, total: 0, warnings: [] }
  test('the card behind the +N badge names the other features (052 #43)', () => {
    const s = state(feature('implement'), { features: [feature('implement'), other] })
    expect(otherFeaturesCard(s)).toBe('Other features in progress: 003 other')
    expect(otherFeaturesCard(state(feature('implement')))).toBeUndefined()
  })
  test('#14: the reason the next command is next', () => {
    expect(nextReason(state(feature('implement'), { nextCommand: '/speckit-implement' }))).toBe('17 tasks are still open')
    expect(nextReason(state(feature('plan', 0, 0), { nextCommand: '/speckit-plan' }))).toBe('the spec is clear: decide how to build it')
    expect(nextReason(state(feature('plan', 0, 0)))).toBeUndefined()
  })
  test('after the active feature is done, the reason names the highest-priority next spec', () => {
    const active = feature('done', 31, 31)
    const normal = feature('specify', 0, 2, { id: '003', dir: '003-normal', name: 'normal' })
    const high = feature('specify', 0, 1, { id: '004', dir: '004-high', name: 'high' })
    const s = state(active, { features: [active, normal, high], nextCommand: '/speckit-specify' })
    expect(nextReason(s, 'en', { '003': 'normal', '004': 'high' })).toBe(
      'the active feature is finished: start 004 high next (high priority)',
    )
  })
})

describe('the pull request at the right edge (075 FR-002)', () => {
  test('from 200 columns of a full band, with its CI mark', () => {
    expect(bandPr({ number: 41, checks: 'pass' }, 200)).toEqual({ label: 'PR #41', mark: '✓', role: 'done' })
    expect(bandPr({ number: 41, checks: 'fail' }, 220)).toEqual({ label: 'PR #41', mark: '✖', role: 'blocked' })
    expect(bandPr({ number: 41, checks: 'pending' }, 200)).toMatchObject({ mark: '◷', role: 'current' })
    expect(bandPr({ number: 41, checks: 'none' }, 200)).toMatchObject({ mark: '' })
  })
  test('never below 200, in the compact or minimal density, or without a pull request', () => {
    expect(bandPr({ number: 41, checks: 'pass' }, 199)).toBeUndefined()
    expect(bandPr({ number: 41, checks: 'pass' }, 200, 'compact')).toBeUndefined()
    expect(bandPr({ number: 41, checks: 'pass' }, 200, 'minimal')).toBeUndefined()
    expect(bandPr(undefined, 200)).toBeUndefined()
  })
})
