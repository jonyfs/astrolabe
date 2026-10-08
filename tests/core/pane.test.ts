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
  test('sections by status, aligned columns with counts on every spec, then warnings (044)', () => {
    expect(texts(specsRows(state(), 80))).toEqual([
      'In progress (1)',
      '▸ ◐ 002 band-hint   implement  ████░░░░░░   9/20  45%',
      'Done (1)',
      '  ● 001 core-state  done       ██████████  49/49 100%',
      'Abandoned (1)',
      '  ○ 003 dropped     abandoned  ░░░░░░░░░░    0/3   0%',
      '! 002: [NEEDS CLARIFICATION] left after the plan',
    ])
  })
  test('roles: accent for the active one, done, muted and dim for abandoned; sections muted', () => {
    const rows = specsRows(state(), 80).filter(r => r.key.startsWith('feature-') || r.key.startsWith('warning'))
    expect(rows.map(r => [r.role, r.dim === true])).toEqual([
      ['accent', false],
      ['done', false],
      ['muted', true],
      ['current', false],
    ])
  })
  test('the running skill shows on the active feature (044 #33)', () => {
    const rows = specsRows(state({ runningSkill: { name: 'speckit-implement', step: 'implement' } }), 100)
    expect(texts(rows)[1]).toBe('▸ ◐ 002 band-hint   implement  ████░░░░░░   9/20  45%  ⟳ speckit-implement')
  })
  test('a stale feature.json is named when the branch is on an active feature (044 #34)', () => {
    const done = f('001', 'core-state', 'done', 49, 49)
    const doing = f('002', 'band-hint', 'implement', 9, 20)
    const rows = specsRows(state({ features: [done, doing], active: { dir: '001-core-state', id: '001', name: 'core-state', source: 'feature.json' }, branchFeature: '002-band-hint' }), 120)
    expect(texts(rows)).toContain('! .specify/feature.json still names 001 core-state, which is done; the branch is on 002 band-hint: set it to specs/002-band-hint')
  })
  test('a guessed active feature is explained', () => {
    const rows = specsRows(state({ activeWarning: 'feature-json-dangling', active: { dir: '002-band-hint', id: '002', name: 'band-hint', source: 'latest' } }), 120)
    expect(texts(rows)).toContain('~ .specify/feature.json points at a missing folder; showing 002 (latest)')
  })
  test('narrow panes drop the bar, then the count, then cut the name, never the id', () => {
    const row = (columns: number) => texts(specsRows(state(), columns).filter(r => r.key === 'feature-002'))[0]
    expect(row(48)).toBe('▸ ◐ 002 band-hint   implement   9/20  45%')
    expect(row(34)).toBe('▸ ◐ 002 band-hint  implement 45%')
    expect(row(27)).toBe('▸ ◐ 002 b…  implement 45%')
    for (let columns = 12; columns <= 120; columns += 1) {
      for (const row of specsRows(state(), columns).filter(r => r.key.startsWith('feature-'))) {
        expect(width(row.text) <= columns || /^. . \d{3}/.test(row.text)).toBe(true)
        expect(/\d{3}/.test(row.text)).toBe(true)
      }
    }
  })
  test('no Spec Kit, or no features yet', () => {
    expect(texts(specsRows({ present: false, constitution: 'missing', features: [], isAnalyzed: false }, 80))).toEqual(['This project does not use Spec Kit. Run specify init to start.'])
    expect(texts(specsRows(state({ features: [] }), 80))).toEqual(['No features yet. Run /speckit-specify.'])
  })
})

describe('taskRows', () => {
  const memo = (tasks: string): SessionMemo => ({ ...emptyMemo(), files: { '002-band-hint': { dir: '002-band-hint', plan: true, tasks } } })
  const TASKS = '- [X] T001 a\n- [ ] T002 [P] [US1] Write `x.ts`\n- [ ] T003 c\n- [ ] T004 d\n'
  test('open tasks in file order after a count', () => {
    expect(texts(taskRows(state(), memo(TASKS), 10, 80))).toEqual(['1/4 done', '✓ T001', '⇉ T002 Write x.ts', 'T003 c', 'T004 d'])
  })
  test('the current task is marked, with how long it has run (045 #42)', () => {
    const now = 10 * 60_000
    const rows = taskRows(state({ currentTask: { id: 'T003', text: 'c', startedAt: 0 } }), memo(TASKS), 10, 80, 'en', now)
    expect(texts(rows)).toEqual(['1/4 done', '✓ T001', '⇉ T002 Write x.ts', '▸ T003 c  ⏱ 10m', 'T004 d'])
    expect(rows[3]?.role).toBe('current')
  })
  test('[P] runs are bracketed and stories head their tasks (045 #43, #44)', () => {
    const text = '## Phase 3: User Story 1\n- [ ] T001 [P] a\n- [ ] T002 [P] b\n- [ ] T003 [P] c\n## Phase 4: User Story 2\n- [ ] T004 d\n'
    expect(texts(taskRows(state(), memo(text), 20, 80))).toEqual([
      '0/4 done',
      '⇉ T001, T002, T003 can run in parallel as subagents',
      'Phase 3: User Story 1',
      '┌ T001 a',
      '│ T002 b',
      '└ T003 c',
      'Phase 4: User Story 2',
      'T004 d',
    ])
  })
  test('too many for the rows ends with +N more', () => {
    expect(texts(taskRows(state(), memo(TASKS), 3, 80))).toEqual(['1/4 done', '✓ T001', '⇉ T002 Write x.ts', '+2 more'])
  })
  test('empty cases', () => {
    expect(texts(taskRows(state(), memo('- [x] T001 a\n'), 10, 80))).toEqual(['1/1 done', 'All tasks are ticked.'])
    const { active: _a, ...none } = state()
    expect(texts(taskRows(none, emptyMemo(), 10, 80))).toEqual(['No active feature. Run /speckit-specify to start one.'])
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
      'This project does not use Spec Kit. Run specify init to start.',
    ])
  })
})

describe('taskRows without tasks (010)', () => {
  test('a feature without tasks says so instead of 0/0 done', () => {
    const quick = state({ activeTasks: [] })
    expect(texts(taskRows(quick, emptyMemo(), 10, 80))).toEqual(['No tasks yet: this feature has no tasks.md, or it lists none. Run /speckit-tasks.'])
  })
})

describe('specsRows: unreadable files (013)', () => {
  test('a file that exists but cannot be read is named', () => {
    const rows = specsRows(state({ features: [f('002', 'band-hint', 'implement', 9, 20, ['unreadable-tasks'])] }), 80)
    expect(texts(rows)).toContain('! 002: tasks.md exists but could not be read')
  })
})

describe('spec chips (044 #39)', () => {
  test('open questions and checklist items ride on the row', () => {
    const doing = { ...f('002', 'band-hint', 'implement', 9, 20), clarifications: 2, checklist: { open: 3, total: 5 } }
    const rows = specsRows(state({ features: [doing] }), 120)
    expect(texts(rows).find(t => t.includes('002'))).toBe('▸ ◐ 002 band-hint  implement  ████░░░░░░  9/20  45%  ?2 ☐3')
  })
})
