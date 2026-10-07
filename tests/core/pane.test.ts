import { describe, expect, test } from 'claude-code/testing'

import { sessionRows, specsRows, taskRows } from '../../hooks/core/pane'
import { emptyMemo, type Feature, type SessionMemo, type SpeckitState } from '../../hooks/core/types'

const f = (id: string, name: string, phase: Feature['phase'], done: number, total: number, warnings: Feature['warnings'] = []): Feature => ({
  id,
  name,
  dir: `${id}-${name}`,
  phase,
  done,
  total,
  warnings,
})
const FEATURES = [f('001', 'core-state', 'done', 49, 49), f('002', 'band-hint', 'implement', 9, 20, ['clarification-after-plan']), f('003', 'dropped', 'abandoned', 0, 3)]
const state = (over: Partial<SpeckitState> = {}): SpeckitState => ({
  present: true,
  root: '/proj',
  constitution: 'ratified',
  features: FEATURES,
  active: { dir: '002-band-hint', id: '002', name: 'band-hint', source: 'feature.json' },
  currentTask: { id: 'T010', text: 'task 10', startedAt: 0 },
  nextCommand: '/speckit-implement',
  isAnalyzed: true,
  ...over,
})
const texts = (rows: Array<{ text: string }>) => rows.map(r => r.text)
const width = (s: string) => [...s].length

describe('specsRows', () => {
  test('one row per feature, the active one marked, then warnings', () => {
    expect(texts(specsRows(state(), 80))).toEqual([
      '  ● 001 core-state  done  ██████████ 100%',
      '▸ ◐ 002 band-hint  implement  ████░░░░░░ 45%',
      '  ○ 003 dropped  abandoned  ░░░░░░░░░░ 0%',
      '! 002: [NEEDS CLARIFICATION] left after the plan',
    ])
  })
  test('roles: done, accent for the active one, muted and dim for abandoned', () => {
    const rows = specsRows(state(), 80)
    expect(rows.map(r => [r.role, r.dim === true])).toEqual([
      ['done', false],
      ['accent', false],
      ['muted', true],
      ['current', false],
    ])
  })
  test('a guessed active feature is explained', () => {
    const rows = specsRows(state({ activeWarning: 'feature-json-dangling', active: { dir: '002-band-hint', id: '002', name: 'band-hint', source: 'latest' } }), 120)
    expect(texts(rows)).toContain('~ .specify/feature.json points at a missing folder; showing 002 (latest)')
  })
  test('narrow panes drop the bar, then cut the name, never the id', () => {
    expect(texts(specsRows(state(), 32))[1]).toBe('▸ ◐ 002 band-hint  implement 45%')
    expect(texts(specsRows(state(), 25))[1]).toBe('▸ ◐ 002 b…  implement 45%')
    expect(texts(specsRows(state(), 23))[1]).toBe('▸ ◐ 002  implement 45%')
    for (let columns = 12; columns <= 120; columns += 1) {
      for (const row of specsRows(state(), columns).slice(0, 3)) {
        expect(width(row.text) <= columns || /^. . \d{3}/.test(row.text)).toBe(true)
        expect(/\d{3}/.test(row.text)).toBe(true)
      }
    }
  })
  test('no Spec Kit, or no features yet', () => {
    expect(texts(specsRows({ present: false, constitution: 'missing', features: [], isAnalyzed: false }, 80))).toEqual(['This project does not use Spec Kit.'])
    expect(texts(specsRows(state({ features: [] }), 80))).toEqual(['No features yet. Run /speckit-specify.'])
  })
})

describe('taskRows', () => {
  const memo = (tasks: string): SessionMemo => ({ ...emptyMemo(), files: { '002-band-hint': { dir: '002-band-hint', plan: true, tasks } } })
  const TASKS = '- [X] T001 a\n- [ ] T002 [P] [US1] Write `x.ts`\n- [ ] T003 c\n- [ ] T004 d\n'
  test('open tasks in file order after a count', () => {
    expect(texts(taskRows(state(), memo(TASKS), 10, 80))).toEqual(['1/4 done', 'T002 Write x.ts', 'T003 c', 'T004 d'])
  })
  test('too many for the rows ends with +N more', () => {
    expect(texts(taskRows(state(), memo(TASKS), 3, 80))).toEqual(['1/4 done', 'T002 Write x.ts', '+2 more'])
  })
  test('empty cases', () => {
    expect(texts(taskRows(state(), memo('- [x] T001 a\n'), 10, 80))).toEqual(['1/1 done', 'All tasks are ticked.'])
    const { active: _a, ...none } = state()
    expect(texts(taskRows(none, emptyMemo(), 10, 80))).toEqual(['No active feature.'])
  })
  test('long tasks are cut, ids kept', () => {
    const rows = taskRows(state(), memo(`- [ ] T002 ${'y'.repeat(100)}\n`), 10, 20)
    expect(rows[1]?.text).toBe(`T002 ${'y'.repeat(14)}…`)
  })
})

describe('sessionRows', () => {
  test('labels and values', () => {
    expect(texts(sessionRows(state({ runningSkill: { name: 'speckit-implement', step: 'implement' } }), 125_000))).toEqual([
      'root          /proj',
      'constitution  ratified',
      'active        002 band-hint',
      'chosen by     feature.json',
      'next          /speckit-implement',
      'running       speckit-implement',
      'analyzed      yes',
      'current task  T010 · 2m',
    ])
  })
  test('without Spec Kit', () => {
    expect(texts(sessionRows({ present: false, constitution: 'missing', features: [], isAnalyzed: false }, 0))).toEqual([
      'This project does not use Spec Kit.',
    ])
  })
})

describe('taskRows without tasks (010)', () => {
  test('a feature without tasks says so instead of 0/0 done', () => {
    const quick = state({ activeTasks: [] })
    expect(texts(taskRows(quick, emptyMemo(), 10, 80))).toEqual(['No tasks yet: this feature has no tasks.md, or it lists none.'])
  })
})
