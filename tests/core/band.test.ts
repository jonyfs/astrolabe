import { describe, expect, test } from 'claude-code/testing'

import { bandSegments, bandText, nextReason } from '../../hooks/core/band'
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
const at = (s: SpeckitState, columns = 200) => bandText(bandSegments(s, columns))

describe('rail marks (FR-003, FR-004)', () => {
  test('implement with tasks: the widest form', () => {
    expect(at(state(feature('implement')))).toBe(
      '◆ 002 band-hint  constitution ● specify ● clarify ● plan ● tasks ● implement ◐  ████░░░░░░ 14/31 45%',
    )
  })
  test('plan phase without tasks: no bar or count', () => {
    expect(at(state(feature('plan', 0, 0)))).toBe('◆ 002 band-hint  constitution ● specify ● clarify ● plan ◐ tasks ○ implement ○')
  })
  test('a template constitution leaves every feature step empty', () => {
    expect(at(state(feature('plan', 0, 0), { constitution: 'template' }))).toBe(
      '◆ 002 band-hint  constitution ◐ specify ○ clarify ○ plan ○ tasks ○ implement ○',
    )
  })
  test('done fills every mark and the bar', () => {
    expect(at(state(feature('done', 31, 31)))).toBe(
      '◆ 002 band-hint  constitution ● specify ● clarify ● plan ● tasks ● implement ●  ██████████ 31/31 100%',
    )
  })
  test('abandoned says so instead of a rail', () => {
    expect(at(state(feature('abandoned', 0, 3)))).toBe('◆ 002 band-hint  abandoned')
  })
  test('a guessed feature carries ~', () => {
    expect(at(state(feature('plan', 0, 0), { activeWarning: 'feature-json-dangling' }))).toMatch(/^◆ ~002 band-hint /)
  })
  test('the running step gets …', () => {
    expect(at(state(feature('plan', 0, 0), { runningSkill: { name: 'speckit-plan', step: 'plan' } }))).toContain('plan ◐…')
  })
  test('tasks written before the plan still show the bar', () => {
    expect(at(state(feature('plan', 1, 4)))).toContain('██░░░░░░░░ 1/4 25%')
  })
  test('nothing to draw without Spec Kit or an active feature', () => {
    expect(bandSegments({ present: false, constitution: 'missing', features: [], isAnalyzed: false }, 200)).toEqual([])
    expect(bandSegments(state(null), 200)).toEqual([])
  })
})

describe('width degradation (FR-006)', () => {
  const s = state(feature('implement'))
  test('the documented forms, widest first', () => {
    expect(at(s, 100)).toBe('◆ 002 band-hint  constitution ● specify ● clarify ● plan ● tasks ● implement ◐  ████░░░░░░ 14/31 45%')
    expect(at(s, 99)).toBe('◆ 002 band-hint  ● ● ● ● ● implement ◐  ████░░░░░░ 14/31 45%')
    expect(at(s, 59)).toBe('◆ 002  ● ● ● ● ● implement ◐  ████░░░░░░ 14/31 45%')
    expect(at(s, 49)).toBe('◆ 002  ● ● ● ● ● implement ◐ 14/31 45%')
    expect(at(s, 37)).toBe('◆ 002  ◐ implement 14/31 45%')
    expect(at(s, 27)).toBe('◆ 002  ◐ implement')
    expect(at(s, 17)).toBe('◆ 002')
    expect(at(s, 4)).toBe('')
  })
  test('at a 100-column terminal (95 body columns) the labels go first', () => {
    expect(at(s, 95)).toBe('◆ 002 band-hint  ● ● ● ● ● implement ◐  ████░░░░░░ 14/31 45%')
  })
  test('every width from 0 to 200 fits and keeps the id whole', () => {
    const guessed = state(feature('implement'), { activeWarning: 'feature-json-malformed', runningSkill: { name: 'x', step: 'implement' } })
    for (let columns = 0; columns <= 200; columns += 1) {
      for (const st of [s, guessed]) {
        const text = at(st, columns)
        expect(width(text) <= columns).toBe(true)
        expect(text === '' || /◆ ~?002(\s|$)/.test(text)).toBe(true)
      }
    }
  })
})

describe('segments carry keys and theme roles', () => {
  test('marks use done/current/pending, the bar uses barFill/barEmpty', () => {
    const segs = bandSegments(state(feature('implement')), 200)
    const role = (key: string) => segs.find(x => x.key === key)?.role
    expect([role('mark-plan'), role('mark-implement'), role('bar-fill'), role('bar-empty'), role('id')]).toEqual([
      'done',
      'current',
      'barFill',
      'barEmpty',
      'accent',
    ])
    expect(bandSegments(state(feature('plan', 0, 0)), 200).find(x => x.key === 'mark-tasks')?.role).toBe('pending')
  })
})

describe('blocked (042 #13)', () => {
  test('clarifications left after the plan turn the current step red with a ?', () => {
    const segments = bandSegments(state(feature('tasks', 0, 0, { warnings: ['clarification-after-plan'] })), 200)
    const mark = segments.find(s => s.key === 'mark-tasks')
    expect(mark).toEqual({ key: 'mark-tasks', text: '?', role: 'blocked' })
    expect(segments.find(s => s.key === 'label-tasks')?.role).toBe('blocked')
    expect(segments.find(s => s.key === 'mark-plan')?.text).toBe('●')
  })
  test('without the warning the step stays ◐', () => {
    expect(bandSegments(state(feature('tasks', 0, 0)), 200).find(s => s.key === 'mark-tasks')?.text).toBe('◐')
  })
})

describe('band, part two (042)', () => {
  const other = { id: '003', name: 'other', dir: '003-other', phase: 'plan' as const, done: 0, total: 0, warnings: [] }
  test('#17 #18: a +N badge for other features in progress, and the worktree the active one runs in', () => {
    const s = state(feature('implement'), { features: [feature('implement'), other] })
    expect(at(s)).toContain('◆ 002 band-hint +1  ')
    expect(bandText(bandSegments(s, 200, { worktree: 'astrolabe-dev' }))).toContain('band-hint +1 ⑂ astrolabe-dev')
  })
  test('#11: step names only from 100 columns', () => {
    expect(at(state(feature('implement')), 100)).toContain('constitution ●')
    expect(at(state(feature('implement')), 99)).not.toContain('constitution')
  })
  test('#20: compact and minimal', () => {
    expect(bandText(bandSegments(state(feature('implement')), 200, { density: 'compact' }))).toBe('◆ 002  ◐ implement 14/31 45%')
    expect(bandText(bandSegments(state(feature('implement')), 200, { density: 'minimal' }))).toBe('◆ 002  ◐ implement')
  })
  test('#14: the reason the next command is next', () => {
    expect(nextReason(state(feature('implement'), { nextCommand: '/speckit-implement' }))).toBe('17 tasks are still open')
    expect(nextReason(state(feature('plan', 0, 0), { nextCommand: '/speckit-plan' }))).toBe('the spec is clear: decide how to build it')
    expect(nextReason(state(feature('plan', 0, 0)))).toBeUndefined()
  })
})
