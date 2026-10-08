import { describe, expect, test } from 'claude-code/testing'

import { filterFeatures, gatesText, sessionRows, specsRows, taskRows } from '../../hooks/core/pane'
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
  test('sections by status, aligned columns with counts on every spec, warnings under their feature (044, 052 #14)', () => {
    expect(texts(specsRows(state(), 80))).toEqual([
      'In progress (1)',
      '▸ ◐ 002 band-hint   implement  ████░░░░░░   9/20  45%',
      '  gates  constitution ✓  clarify ✗  checklist –  tasks ✓  analyze ✓',
      '! 002: [NEEDS CLARIFICATION] left after the plan',
      'Done (1)',
      '  ● 001 core-state  done       ██████████  49/49 100%',
      'Abandoned (1)',
      '  ○ 003 dropped     abandoned  ░░░░░░░░░░    0/3   0%',
    ])
  })
  test('roles: accent for the active one, done, muted and dim for abandoned; sections muted', () => {
    const rows = specsRows(state(), 80).filter(r => r.key.startsWith('feature-') || r.key.startsWith('warning'))
    expect(rows.map(r => [r.role, r.dim === true])).toEqual([
      ['accent', false],
      ['current', false],
      ['done', false],
      ['muted', true],
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
    expect(texts(taskRows(state(), memo(TASKS), 10, 80))).toEqual(['002 band-hint · implement · 1/4 done', '✓ 1 done · T001', '⇉ T002 Write x.ts', 'T003 c', 'T004 d'])
  })
  test('the current task is marked, with how long it has run (045 #42)', () => {
    const now = 10 * 60_000
    const rows = taskRows(state({ currentTask: { id: 'T003', text: 'c', startedAt: 0 } }), memo(TASKS), 10, 80, 'en', now)
    expect(texts(rows)).toEqual(['002 band-hint · implement · 1/4 done', '✓ 1 done · T001', '⇉ T002 Write x.ts', '▸ T003 c  ⏱ 10m', 'T004 d'])
    expect(rows[3]?.role).toBe('current')
  })
  test('[P] runs are bracketed and stories head their tasks (045 #43, #44)', () => {
    const text = '## Phase 3: User Story 1\n- [ ] T001 [P] a\n- [ ] T002 [P] b\n- [ ] T003 [P] c\n## Phase 4: User Story 2\n- [ ] T004 d\n'
    expect(texts(taskRows(state(), memo(text), 20, 80))).toEqual([
      '002 band-hint · implement · 0/4 done',
      'Phase 3: User Story 1 · 0/3',
      '┌ T001 a',
      '│ T002 b',
      '└ T003 c',
      'Phase 4: User Story 2 · 0/1',
      'T004 d',
    ])
  })
  test('too many for the rows ends with +N more', () => {
    expect(texts(taskRows(state(), memo(TASKS), 3, 80))).toEqual(['002 band-hint · implement · 1/4 done', '✓ 1 done · T001', '⇉ T002 Write x.ts', '+2 more'])
  })
  test('empty cases', () => {
    expect(texts(taskRows(state(), memo('- [x] T001 a\n'), 10, 80))).toEqual(['002 band-hint · implement · 1/1 done', 'All tasks are ticked.'])
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

describe('filterFeatures (054 #21)', () => {
  test('words and is:status', () => {
    const fs = [f('001', 'core-state', 'done', 49, 49), f('002', 'band-hint', 'implement', 9, 20), f('003', 'dropped', 'abandoned', 0, 3)]
    expect(filterFeatures(fs, 'is:done', '002-band-hint').map(x => x.id)).toEqual(['001'])
    expect(filterFeatures(fs, 'band is:progress', '002-band-hint').map(x => x.id)).toEqual(['002'])
    expect(filterFeatures(fs, '', '002-band-hint', 'abandoned').map(x => x.id)).toEqual(['003'])
    expect(filterFeatures(fs, 'is:done', '002-band-hint', 'abandoned').map(x => x.id)).toEqual(['001'])
  })
})

describe('worktrees on the Specs tab (054 #49, #52)', () => {
  test('a feature row names its worktrees; two on one feature is a warning', () => {
    const rows = specsRows(state(), 140, 'en', {}, { '002': ['wt-a', 'wt-b'] })
    expect(texts(rows).find(t => t.includes('002 band-hint'))).toContain('⑂ wt-a, wt-b')
    expect(texts(rows)).toContain('! 002 is open in two worktrees (wt-a, wt-b): their changes will collide')
    expect(texts(specsRows(state(), 140, 'en', {}, { '002': ['wt-a'] })).some(t => t.includes('collide'))).toBe(false)
  })
})

describe('gates (054 #56)', () => {
  test('each gate: ✓, ✗ with its count, or – not yet', () => {
    const f0 = { clarifications: 2, checklist: { open: 3, total: 5 }, total: 0, warnings: [] }
    expect(gatesText({ constitution: 'template', isAnalyzed: false }, f0)).toBe('  gates  constitution ✗  clarify ✗2  checklist ✗3  tasks –  analyze –')
    expect(gatesText({ constitution: 'ratified', isAnalyzed: true }, { total: 4, warnings: [] })).toBe('  gates  constitution ✓  clarify ✓  checklist –  tasks ✓  analyze ✓')
  })
})

describe('folded sections (052 #10, #11)', () => {
  test('Done past three features folds to its heading when asked; the active one keeps it open', () => {
    const done = ['011', '012', '013', '014'].map(id => f(id, `d${id}`, 'done', 1, 1))
    const st = state({ features: [f('002', 'band-hint', 'implement', 9, 20), ...done] })
    const rows = texts(specsRows(st, 120, 'en', {}, {}, true))
    expect(rows).toContain('Done (4) · folded; s or is:done shows them')
    expect(rows.some(t => t.includes('011 d011'))).toBe(false)
    expect(texts(specsRows(st, 120)).some(t => t.includes('011 d011'))).toBe(true)
  })
})

describe('coloured rows (052 #12, 054 #71)', () => {
  test('the widest form colours the phase and the bar, and the segments join to the text', () => {
    const row = specsRows(state(), 120).find(r => r.key === 'feature-002')!
    expect(row.segments?.map(s => s.text).join('')).toBe(row.text)
    expect(row.segments?.map(s => s.role)).toEqual(['accent', 'current', 'accent', 'barFill', 'barEmpty', 'accent'])
    expect(specsRows(state(), 40).find(r => r.key === 'feature-002')?.segments).toBeUndefined()
  })
})

describe('task ids line up (052 #22)', () => {
  test('a short id is padded to the widest', () => {
    const memo2 = { ...emptyMemo(), files: { '002-band-hint': { dir: '002-band-hint', plan: true, tasks: '- [ ] T9 a\n- [ ] T10 b\n' } } }
    const rows = texts(taskRows(state(), memo2, 10, 80))
    expect(rows).toContain('T9  a')
    expect(rows).toContain('T10 b')
  })
})

describe('warning order (054 #29)', () => {
  test('an unreadable file comes before open questions', () => {
    const odd = { ...f('002', 'band-hint', 'implement', 9, 20, ['unreadable-tasks']), clarifications: 2 }
    const rows = texts(specsRows(state({ features: [odd] }), 120))
    expect(rows.findIndex(t => t.includes('could not be read'))).toBeLessThan(rows.findIndex(t => t.includes('[NEEDS CLARIFICATION] markers')))
  })
})

describe('ids padded to the widest (054 #25)', () => {
  test('every name starts in the same column when the ids differ in length', () => {
    const features = [f('001', 'core', 'implement', 1, 2), f('20261008-1200', 'stamped', 'implement', 1, 2)]
    const rows = specsRows(state({ features, active: { dir: '001-core', id: '001', name: 'core', source: 'feature.json' } }), 120).filter(r => r.key.startsWith('feature-'))
    const starts = rows.map(r => r.text.indexOf(r.text.includes('core') ? 'core' : 'stamped'))
    expect(new Set(starts).size).toBe(1)
  })
})

describe('links to plan.md and tasks.md (054 #77)', () => {
  test('a feature past tasks links all three files; one still specifying links spec.md only', () => {
    const features = [f('002', 'band-hint', 'implement', 9, 20), f('004', 'new', 'specify', 0, 0)]
    const rows = specsRows(state({ features }), 120)
    const row = (id: string) => rows.find(r => r.key === `feature-${id}`)
    expect(row('002')?.href).toBe('file:///proj/specs/002-band-hint/spec.md')
    expect(row('002')?.links).toEqual([
      { label: 'plan', href: 'file:///proj/specs/002-band-hint/plan.md' },
      { label: 'tasks', href: 'file:///proj/specs/002-band-hint/tasks.md' },
    ])
    expect(row('004')?.links).toBeUndefined()
  })
})

describe('one colour per kind of message (054 #72)', () => {
  test('a file that cannot be read is an error, drawn red', () => {
    const rows = specsRows(state({ features: [f('002', 'band-hint', 'implement', 9, 20, ['unreadable-spec'])] }), 120)
    expect(rows.find(r => r.key.startsWith('warning-002-'))?.role).toBe('blocked')
  })
})
