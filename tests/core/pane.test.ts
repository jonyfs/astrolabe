import { describe, expect, test } from 'claude-code/testing'

import { nextFor, reconcileSuggestion, skillsForPhase, specDetail } from '../../hooks/core/spec-actions'

import { filterChips, filterFeatures, gatesText, helpRows, moveSpecSelection, nextSort, sessionRows, specsRows, wrappedRows } from '../../hooks/core/pane'
import { specChildren, type ChildrenContext } from '../../hooks/core/pane-tree'
import { parseTasks } from '../../hooks/core/tasks-parser'
import { buildHelp } from '../../hooks/modules/help'
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
/** The rows under the active spec for a tasks.md text (078). */
const kids = (st: SpeckitState, text: string, over: Partial<ChildrenContext> = {}) =>
  specChildren(st.features.find(x => x.dir === st.active?.dir)!, parseTasks(text), {
    columns: 80,
    lang: 'en',
    now: 0,
    isActive: true,
    tasksOnly: false,
    ...(st.root === undefined ? {} : { root: st.root }),
    ...(st.currentTask === undefined ? {} : { currentTask: st.currentTask }),
    times: [],
    ...over,
  })
const width = (s: string) => [...s].length

describe('specsRows', () => {
  test('memoizes by state version and drawing inputs', () => {
    const current = state({ memoVersion: 10 })
    const rows = specsRows(current, 80)
    expect(specsRows(current, 80)).toBe(rows)
    expect(specsRows(current, 100)).not.toBe(rows)
    expect(specsRows({ ...current, memoVersion: 11 }, 80)).not.toBe(rows)
    expect(specsRows({ ...current, features: current.features.map(f => ({ ...f, done: f.done + 1 })) }, 80)).not.toBe(rows)
    expect(specsRows(current, 80, 'pt-BR')).not.toBe(rows)
    expect(specsRows(current, 80, 'en', { '002': 'high' })).not.toBe(rows)
  })

  test('sections by status, aligned columns with counts on every spec, warnings under their feature (044, 052 #14)', () => {
    expect(texts(specsRows(state(), 80))).toEqual([
      'Active 1',
      '▸ ◆ 002 band-hint   implement  ▰▰▰▰▱▱▱▱▱   9/20  45%',
      '  gates  constitution ✓  clarify ✗  checklist –  tasks ✓  analyze ✓',
      '! 002: [NEEDS CLARIFICATION] left after the plan',
      'Done 1',
      '  ✓ 001 core-state  done       ▰▰▰▰▰▰▰▰▰  49/49 100%',
      'Abandoned 1',
      '  ✖ 003 dropped     abandoned  ▱▱▱▱▱▱▱▱▱    0/3   0%',
    ])
  })
  test('long feature names wrap on desktop and are elided for terminal rows', () => {
    const longName = 'feature-name-longer-than-twenty-four-characters'
    const features = [f('001', longName, 'done', 1, 1)]
    const current = state({ features, active: undefined })
    const worktrees = [{ name: 'wt', id: '001', featureName: longName, phase: 'implement', done: 0, total: 1, status: '' }]
    const desktop = specsRows(current, 40, 'en', {}, {}, false, worktrees, true)
    const terminal = specsRows(current, 40, 'en', {}, {}, false, worktrees)
    for (const key of ['feature-001', 'worktree-wt']) {
      const desktopText = desktop.find(row => row.key === key)?.text
      const terminalText = terminal.find(row => row.key === key)?.text
      expect(desktopText).toContain(longName)
      expect(terminalText).toContain('…')
      expect(terminalText).not.toContain(longName)
    }
  })
  test('roles: accent for the active one, done, faint for abandoned; sections muted (064 #2)', () => {
    const rows = specsRows(state(), 80).filter(r => r.key.startsWith('feature-') || r.key.startsWith('warning'))
    expect(rows.map(r => r.role)).toEqual(['accent', 'current', 'done', 'faint'])
    // Muted text is a colour that reaches 4.5:1, not the terminal's dim attribute.
    expect(rows.every(r => !('dim' in r))).toBe(true)
  })
  test('text rows never use the pending role, which is for rules and glyphs (064 #2)', () => {
    const rows = [...specsRows(state(), 80), ...kids(state(), '- [ ] T001 a\n')]
    expect(rows.filter(r => /[A-Za-z0-9]/.test(r.text)).map(r => r.role)).not.toContain('pending')
  })
  test('the running skill shows on the active feature (044 #33)', () => {
    const rows = specsRows(state({ runningSkill: { name: 'speckit-implement', step: 'implement' } }), 100)
    expect(texts(rows)[1]).toBe('▸ ◆ 002 band-hint   implement  ▰▰▰▰▱▱▱▱▱   9/20  45%  ⟳ speckit-implement')
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
    expect(row(48)).toBe('▸ ◆ 002 band-hint   implement   9/20  45%')
    expect(row(34)).toBe('▸ ◆ 002 band-hint   impl  45%')
    expect(row(27)).toBe('▸ ◆ 002 band-h…  impl 45%')
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

describe('Specs row selection (054 #66)', () => {
  const rows = [{ key: 'feature-001', index: 1 }, { key: 'feature-002', index: 4 }, { key: 'feature-003', index: 8 }]

  test('moves through feature rows and clamps at either end', () => {
    expect(moveSpecSelection(rows, 'feature-001', 1)).toBe('feature-002')
    expect(moveSpecSelection(rows, 'feature-003', -1)).toBe('feature-002')
    expect(moveSpecSelection(rows, 'feature-003', 1)).toBeUndefined()
    expect(moveSpecSelection(rows, 'feature-001', -1)).toBeUndefined()
    expect(moveSpecSelection(rows, 'feature-001', 10)).toBe('feature-003')
  })
})

describe('the rows under a spec (078)', () => {
  const TASKS = '- [X] T001 a\n- [ ] T002 [P] [US1] Write `x.ts`\n- [ ] T003 c\n- [ ] T004 d\n'
  test('open tasks sit at column 4 in file order, after the done ones folded to one line', () => {
    expect(texts(kids(state({ currentTask: undefined }), TASKS))).toEqual(['    ✓ 1 done · T001', `${'    ○ T002 Write x.ts'.padEnd(77 - 'P'.length)}P`, '    ○ T003 c', '    ○ T004 d'])
  })
  test('the current task is pinned first at column 2, with how long it has run (045 #42, 078 FR-012)', () => {
    const now = 10 * 60_000
    const rows = kids(state({ currentTask: { id: 'T003', text: 'c', startedAt: 0 } }), TASKS, { now })
    expect(texts(rows)).toEqual([`${'  ▶ T003 c'.padEnd(77 - '◷ 10m'.length)}◷ 10m`, '    ✓ 1 done · T001', `${'    ○ T002 Write x.ts'.padEnd(77 - 'P'.length)}P`, '    ○ T004 d'])
    expect(rows[0]?.role).toBe('current')
    expect(rows[0]?.bold).toBe(true)
    expect(rows[0]?.highlight).toBe(true)
    expect(rows[1]?.bold).toBeUndefined()
  })
  test('[P] runs are bracketed at the right edge, offer one action, and stories carry a bar (045 #43, #44, 078 FR-038)', () => {
    const text = '## Phase 3: User Story 1\n- [ ] T001 [P] a\n- [ ] T002 [P] b\n- [ ] T003 [P] c\n## Phase 4: User Story 2 - Cart page (P2)\n- [ ] T004 d\n'
    const edge = (body: string, mark: string) => `${body.padEnd(77 - mark.length)}${mark}`
    expect(texts(kids(state({ currentTask: undefined }), text))).toEqual([
      '  US1 ▱▱▱▱▱ 0/3',
      edge('    ○ T001 a', '┐ P'),
      edge('    ○ T002 b', '┤ P'),
      edge('    ○ T003 c', '┘ P'),
      '    ⇉ 3 tasks can run at once',
      '  US2 Cart page ▱▱▱▱▱ 0/1',
      '    ○ T004 d',
    ])
    expect(kids(state({ currentTask: undefined }), text).find(r => r.key.startsWith('parallel-'))?.action?.kind).toBe('parallel')
  })
  test('too many open tasks end with a more row, unless tasks only is on (078 FR-005)', () => {
    const text = Array.from({ length: 12 }, (_, i) => `- [ ] T${String(i + 1).padStart(3, '0')} item\n`).join('')
    const rows = texts(kids(state({ currentTask: undefined }), text))
    expect(rows.at(-1)).toBe('    … 4 more · t shows all')
    expect(texts(kids(state({ currentTask: undefined }), text, { tasksOnly: true }))).toHaveLength(12)
  })
  test('empty cases', () => {
    expect(texts(kids(state({ currentTask: undefined }), '- [x] T001 a\n'))).toEqual(['    ✓ 1 done · T001', '    ✓ All tasks are ticked.'])
    expect(texts(kids(state({ currentTask: undefined }), ''))).toEqual(['    no tasks yet'])
  })
  test('long tasks are cut, ids kept', () => {
    const rows = kids(state({ currentTask: undefined }), `- [ ] T002 ${'y'.repeat(100)}\n`, { columns: 20 })
    expect(rows[0]?.text).toBe(`    ○ T002 ${'y'.repeat(5)}…`)
  })
  test('a task that waits says on which one, and a test task names the task it covers (078 FR-039, FR-040)', () => {
    const text = '- [ ] T012 Write failing tests for out-of-stock items\n- [ ] T013 Block checkout\n'
    const rows = texts(kids(state({ currentTask: undefined }), text, { columns: 60 }))
    expect(rows[0]).toContain('test → T013')
    expect(rows[1]).toContain('‖ after T012')
  })
  test('a task that names another one with after, depends on or blocked by waits for it', () => {
    const rows = texts(kids(state({ currentTask: undefined }), '- [ ] T001 a\n- [ ] T002 b (blocked by T001)\n'))
    expect(rows[1]).toContain('‖ after T001')
  })
  test('open questions come first, each with an ask action, and a task filter drops the rest (078 FR-045, FR-007)', () => {
    const rows = kids(state({ currentTask: undefined }), '- [ ] T001 apple\n- [ ] T002 pear\n', { questions: ['Which login?'] })
    expect(rows[0]?.text).toBe('  ? 1 open questions')
    expect(rows[1]?.action?.kind).toBe('ask')
    expect(texts(kids(state({ currentTask: undefined }), '- [ ] T001 apple\n- [ ] T002 pear\n', { words: 'pea' }))).toEqual(['    ○ T002 pear'])
  })
  test('the checklist is the last story, linked to its folder (078 FR-044)', () => {
    const rows = kids(state({ currentTask: undefined }), '- [ ] T001 a\n', { checklist: { open: 2, total: 5 } })
    expect(rows.at(-1)).toMatchObject({ key: 'checklist-002-band-hint', text: '  ☐ checklist: 2 of 5 open', href: 'file:///proj/specs/002-band-hint/checklists' })
  })
})

describe('sessionRows', () => {
  test('labels and values', () => {
    expect(texts(sessionRows(state({ runningSkill: { name: 'speckit-implement', step: 'implement' } }), 125_000))).toEqual([
      'root          /proj',
      'constitution  ✓ ratified · active by feature.json',
      'active        002 band-hint',
      'next          /speckit-implement',
      'running       speckit-implement',
      'analyzed      yes',
      'current task  T010 · 2m05s',
    ])
  })
  test('without Spec Kit', () => {
    expect(texts(sessionRows({ present: false, constitution: 'missing', features: [], isAnalyzed: false }, 0))).toEqual([
      'This project does not use Spec Kit. Run specify init to start.',
    ])
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
    expect(texts(rows).find(t => t.includes('002'))).toBe('▸ ◆ 002 band-hint  implement  ▰▰▰▰▱▱▱▱▱  9/20  45%  ?2 ☐3')
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
    expect(rows).toContain('Done 4 · folded; s or is:done shows them')
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

  test('a full progress bar is green, while an in-progress bar keeps its fill color (052 #13)', () => {
    const rows = specsRows(state(), 120)
    expect(rows.find(r => r.key === 'feature-001')?.segments?.[3]?.role).toBe('done')
    expect(rows.find(r => r.key === 'feature-002')?.segments?.[3]?.role).toBe('barFill')
  })
})

describe('task ids line up (052 #22)', () => {
  test('a short id is padded to the widest', () => {
    const rows = texts(kids(state({ currentTask: undefined }), '- [ ] T9 a\n- [ ] T10 b\n'))
    expect(rows).toContain('    ○ T9  a')
    expect(rows).toContain('    ○ T10 b')
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

describe('a task links to its line (054 #78)', () => {
  test('tasks.md#L<line>, or spec.md for a quick spec', () => {
    const rows = kids(state({ currentTask: undefined }), '- [ ] T010 task 10\n')
    expect(rows.find(r => r.key === 'task-002-band-hint-T010')?.href).toBe('file:///proj/specs/002-band-hint/tasks.md#L1')
    const quick = FEATURES.map(x => (x.id === '002' ? { ...x, track: 'quick' as const } : x))
    const quickRows = kids(state({ currentTask: undefined, features: quick }), '- [ ] T010 task 10\n')
    expect(quickRows.find(r => r.key === 'task-002-band-hint-T010')?.href).toBe('file:///proj/specs/002-band-hint/spec.md#L1')
  })
})

describe('a compact pane under 60 columns (054 #69)', () => {
  test('no bars even when a short name leaves room', () => {
    const features = [f('002', 'ab', 'implement', 9, 20)]
    const narrow = specsRows(state({ features }), 58).find(r => r.key === 'feature-002')
    expect(narrow?.text).not.toContain('▰')
    expect(narrow?.text).toContain('9/20')
    const wide = specsRows(state({ features }), 100).find(r => r.key === 'feature-002')
    expect(wide?.text).toContain('▰')
  })
})

describe('helpRows: commands copy themselves (052 #37)', () => {
  test('the words before the gap, optional parts dropped, only for /astrolabe commands', () => {
    const rows = helpRows(['Astrolabe commands:', '  /astrolabe focus [on|off]   focus mode', '  /astrolabe advisor [id]     review', '  /speckit-plan             plan', '  1 Specs     the specs'].join('\n'))
    expect(rows.map(r => r.copy)).toEqual([undefined, '/astrolabe focus', '/astrolabe advisor', undefined, undefined])
  })
})

describe('the tree, part three (045 #45, #47)', () => {
  test('the current task names its files under it, and the fold row adds the time the done tasks took', () => {
    const text = '- [x] T001 a\n- [ ] T003 c in `src/x.ts` and hooks/y.ts\n- [ ] T004 d\n'
    const rows = kids(state({ currentTask: { id: 'T003', text: 'c', startedAt: 0 } }), text, { now: 60_000, times: [{ dir: '002-band-hint', id: 'T001', ms: 12 * 60_000 }] })
    const lines = rows.map(r => r.text)
    expect(lines.find(t => t.includes('✓'))).toBe('    ✓ 1 done · T001 · 12m')
    const at = lines.findIndex(t => t.includes('T003'))
    expect(lines[at + 1]).toContain('src/x.ts · hooks/y.ts')
    expect(rows[at + 1]?.highlight).toBe(true)
    expect(lines.some(t => t.includes('src/x.ts') && t.includes('T004'))).toBe(false)
  })
})

describe('the Specs filter language and order (061)', () => {
  const f = (id: string, name: string, over: Record<string, unknown> = {}) => ({ id, name, dir: `${id}-${name}`, phase: 'plan' as const, done: 0, total: 0, warnings: [], ...over })
  const list = [
    f('001', 'alpha', { phase: 'implement', done: 4, total: 5, track: 'quick' }),
    f('002', 'beta', { phase: 'plan', clarifications: 2 }),
    f('003', 'gamma', { phase: 'plan', checklist: { open: 1, total: 3 }, warnings: ['no-spec'] }),
    f('004', 'delta', { phase: 'done', done: 3, total: 3 }),
  ]
  test('tokens: phase, has, track, prio, is:active and plain words', () => {
    const ids = (q: string, ctx = {}) => filterFeatures(list, q, '001-alpha', 'all', ctx).map(x => x.id)
    expect(ids('phase:plan')).toEqual(['002', '003'])
    expect(ids('has:questions')).toEqual(['002'])
    expect(ids('has:checklist')).toEqual(['003'])
    expect(ids('has:warning')).toEqual(['003'])
    expect(ids('track:quick')).toEqual(['001'])
    expect(ids('is:active')).toEqual(['001'])
    expect(ids('phase:plan gamma')).toEqual(['003'])
    expect(ids('prio:high', { priorities: { '002': 'high' } })).toEqual(['002'])
    expect(ids('has:worktree', { worktrees: { '004': ['wt'] } })).toEqual(['004'])
  })
  test('filterChips names the active tokens', () => {
    expect(filterChips('phase:plan has:questions beta', 'done')).toEqual(['status:done', 'phase:plan', 'has:questions', '"beta"'])
    expect(filterChips('', 'all')).toEqual([])
  })
  test('o cycles status, progress, name', () => {
    expect([nextSort(undefined), nextSort('progress'), nextSort('name')]).toEqual(['progress', 'name', 'status'])
  })
})

describe('what the selected spec offers (061)', () => {
  test('skills by phase: planning skills early, review and QA while implementing, retro at the end', () => {
    expect(skillsForPhase('specify')).toEqual(['office-hours', 'plan-ceo-review'])
    expect(skillsForPhase('plan')).toContain('plan-eng-review')
    expect(skillsForPhase('implement')).toEqual(['review', 'investigate', 'qa-only', 'health'])
    expect(skillsForPhase('done')[0]).toBe('retro')
  })
  test('the detail line names tasks left, questions, checklist, priority, worktrees and the age (075 FR-008)', () => {
    const line = specDetail(
      { id: '003', name: 'gamma', phase: 'plan', done: 0, total: 8, track: 'quick', clarifications: 2, checklist: { open: 1, total: 3 }, warnings: [] },
      { priority: 'high', worktrees: ['wt-a'], next: '/speckit-plan', age: '5m', lang: 'en' },
    )
    expect(line).toBe('8 left · ? 2 questions · checklist 1 open · ↑ high · ⎇ wt-a · updated 5m')
  })
  test('one question reads in the singular', () => {
    const line = specDetail({ id: '002', name: 'cart', phase: 'implement', done: 9, total: 20, track: 'full', clarifications: 1, warnings: [] }, { lang: 'en' })
    expect(line).toBe('11 left · ? 1 question')
  })
  test('a non-active spec is taken as analyzed, so implement is next', () => {
    expect(nextFor({ phase: 'implement', done: 0 }, false, false)).toBe('/speckit-implement')
    expect(nextFor({ phase: 'implement', done: 0 }, true, false)).toBe('/speckit-analyze')
  })
})

describe('wrappedRows: the footer keeps its rows (investigation of the Specs footer)', () => {
  test('a long paragraph is several rows, not one', () => {
    const paragraph = 'word '.repeat(60).trim()
    expect(wrappedRows(paragraph, 100)).toBe(3)
    expect(wrappedRows(`${paragraph}\n\nshort`, 100)).toBe(5)
    expect(wrappedRows('', 100)).toBe(1)
  })
})

describe('the phase shortens before the name is cut (064 #6)', () => {
  test('a narrow row keeps the id and uses impl for implement', () => {
    const feature: Feature = { id: '002', name: 'band', dir: 'specs/002-band', phase: 'implement', done: 2, total: 8, warnings: [] } as unknown as Feature
    const st = { present: true, constitution: 'ratified', features: [feature], active: { dir: feature.dir, id: '002', name: 'band' }, worktrees: [] } as unknown as SpeckitState
    const rows = specsRows(st, 28).filter(r => r.key.startsWith('feature-'))
    expect(rows[0]?.text).toContain('002')
    expect(rows[0]?.text).toContain('impl')
    expect(rows[0]?.text).not.toContain('implement')
  })
})

describe('the Specs sections in a fixed order (066 #25)', () => {
  const f = (id: string, phase: Feature['phase'], done = 0, total = 0, over: Partial<Feature> = {}): Feature =>
    ({ id, name: `n${id}`, dir: `${id}-n${id}`, phase, done, total, warnings: [], ...over }) as Feature
  const st = (features: Feature[], active?: string): SpeckitState =>
    ({
      present: true,
      root: '/p',
      constitution: 'ratified',
      features,
      ...(active === undefined ? {} : { active: { dir: `${active}-n${active}`, id: active, name: `n${active}`, source: 'feature.json' as const } }),
      isAnalyzed: false,
    }) as SpeckitState
  const headings = (rows: ReturnType<typeof specsRows>) => rows.filter(r => r.key.startsWith('section-')).map(r => r.key.replace('section-', ''))

  test('Active, In progress, Early, Ready to close, Next up, Done, Abandoned', () => {
    const features = [
      f('001', 'done', 5, 5),
      f('002', 'implement', 3, 9),
      f('003', 'specify'),
      f('004', 'implement', 4, 4),
      f('005', 'plan'),
      f('006', 'abandoned', 0, 2),
      f('007', 'implement', 1, 5),
    ]
    const rows = specsRows(st(features, '002'), 100, 'en')
    expect(headings(rows)).toEqual(['active', 'progress', 'early', 'close', 'next', 'done', 'abandoned'])
  })

  test('each feature lands in its own section', () => {
    const rows = specsRows(st([f('002', 'implement', 3, 9), f('003', 'specify'), f('004', 'implement', 4, 4), f('005', 'plan'), f('007', 'implement', 1, 5)], '002'), 100, 'en')
    const under = (key: string) => {
      const i = rows.findIndex(r => r.key === `section-${key}`)
      const out: string[] = []
      for (const r of rows.slice(i + 1)) {
        if (r.key.startsWith('section-')) break
        if (r.key.startsWith('feature-')) out.push(r.key.slice('feature-'.length))
      }
      return out
    }
    expect(under('active')).toEqual(['002'])
    expect(under('progress')).toEqual(['007'])
    expect(under('early')).toEqual(['003'])
    expect(under('close')).toEqual(['004'])
    expect(under('next')).toEqual(['005'])
  })

  test('an empty section draws no heading, and the headings are named', () => {
    const rows = specsRows(st([f('002', 'implement', 3, 9)], '002'), 100, 'en')
    expect(headings(rows)).toEqual(['active'])
    expect(rows.find(r => r.key === 'section-active')?.text).toBe('Active 1')
  })
})

describe('the help overlay groups keys by tab (066 #29)', () => {
  test('one line per tab and one example per filter', () => {
    const text = buildHelp('en', {})
    for (const line of ['Pane: 1-4 tabs', 'Specs: / filter (f)', 'Tree: Enter opens or folds', 'Session: l allow', 'PRs: approve', 'Setup: Enter changes a value']) {
      expect(text).toContain(line)
    }
    for (const example of ['phase:plan', 'has:questions', 'has:checklist', 'track:quick', 'prio:high', 'is:active', 'is:done']) expect(text).toContain(example)
  })
})

describe('the Specs tab at scale (067)', () => {
  const mk = (n: number, over: (i: number) => Partial<Feature> = () => ({})): Feature[] =>
    Array.from({ length: n }, (_, k) => {
      const i = k + 1
      const id = String(i).padStart(3, '0')
      const phase: Feature['phase'] = i % 10 === 0 ? 'implement' : i % 17 === 0 ? 'specify' : 'done'
      return { id, name: `n${id}`, dir: `${id}-n${id}`, phase, done: phase === 'implement' ? 2 : phase === 'done' ? 5 : 0, total: phase === 'implement' ? 8 : phase === 'done' ? 5 : 0, warnings: [], ...over(i) } as Feature
    })
  const st = (features: Feature[], extra: Partial<SpeckitState> = {}): SpeckitState =>
    ({ present: true, root: '/p', constitution: 'ratified', features, isAnalyzed: false, ...extra }) as SpeckitState
  const scaleOf = (view: 'focus' | 'all', extra: Record<string, unknown> = {}) => ({ view, ...extra })
  const rowsOf = (state: SpeckitState, view: 'focus' | 'all' = 'focus', extra: Record<string, unknown> = {}) =>
    specsRows(state, 100, 'en', {}, {}, false, [], false, 'status', undefined, scaleOf(view, extra) as never)

  test('Ready to close: one row with the ids and one button that asks Claude, with the folders (073)', () => {
    const ready = mk(20, i => (i === 3 || i === 5 ? { phase: 'implement' as const, done: 4, total: 4 } : {}))
    const rows = rowsOf(st(ready), 'focus')
    const row = rows.find(r => r.key === 'close-all')
    expect(row?.text).toContain('003 005')
    expect(row?.action).toMatchObject({ kind: 'close', id: '003-n003\n005-n005' })
    // A single ready spec keeps the per-spec button only.
    expect(rowsOf(st(mk(20, i => (i === 3 ? { phase: 'implement' as const, done: 4, total: 4 } : {}))), 'focus').some(r => r.key === 'close-all')).toBe(false)
  })
  test('the active spec says why it is active, under its row (073)', () => {
    const features = mk(14)
    const state = st(features, { active: { dir: features[9]!.dir, id: features[9]!.id, name: 'n010', source: 'latest' } })
    const rows = rowsOf(state, 'focus')
    expect(rows.find(r => r.key === 'active-why')?.text).toContain('highest open spec')
  })
  test('a filter keeps the rows it asked for: Focus gives way to All (067 review)', () => {
    const state = st(mk(60))
    const withFilter = rowsOf(state, 'focus', { filtered: true })
    expect(withFilter.some(r => r.key.startsWith('feature-'))).toBe(true)
    expect(withFilter.some(r => r.key === 'scale-done')).toBe(false)
  })
  test('in All a touched spec is drawn once, in the Touched section (067 review)', () => {
    const state = st(mk(60))
    const rows = rowsOf(state, 'all', { touched: ['011-n011'], open: ['001–050'] })
    expect(rows.filter(r => r.key === 'feature-011')).toHaveLength(1)
    expect(new Set(rows.map(r => r.key)).size).toBe(rows.length)
  })

  test('Focus keeps its height at 64, 200 and 1000 specs, with Done counted per block (067 #31)', () => {
    const heights = [64, 200, 1000].map(n => {
      // The same number of specs that need attention, whatever the total.
      const features = mk(n, i => ({ phase: i <= 6 ? 'implement' : 'done', done: i <= 6 ? 1 : 5, total: i <= 6 ? 4 : 5 }))
      return rowsOf(st(features)).length
    })
    // The same height at 64, 200 and 1000 specs.
    expect(new Set(heights).size).toBe(1)
    const rows = rowsOf(st(mk(140, i => ({ phase: 'done', done: 5, total: 5 }))))
    expect(rows.find(r => r.key === 'scale-done')?.text).toBe('Done 140 ▸ 001–050 50 · 051–100 50 · 101–150 40')
  })

  test('All lists every spec in blocks of 50, folded and opened (067 #31)', () => {
    const state = st(mk(120))
    const folded = rowsOf(state, 'all')
    const headers = folded.filter(r => r.key.startsWith('block-'))
    expect(headers.map(r => r.key)).toEqual(['block-001–050', 'block-051–100', 'block-101–150'])
    expect(headers[0]?.text).toMatch(/^▸ 001–050 ✓\d+ ▶\d+/)
    expect(folded.some(r => r.key === 'feature-001')).toBe(false)
    const opened = rowsOf(state, 'all', { open: ['001–050'] })
    expect(opened.find(r => r.key === 'block-001–050')?.text.startsWith('▾')).toBe(true)
    expect(opened.some(r => r.key === 'feature-001')).toBe(true)
    expect(opened.some(r => r.key === 'feature-051')).toBe(false)
  })

  test('the summary names the specs and where they stand (067)', () => {
    const rows = rowsOf(st(mk(64)))
    const summary = rows.find(r => r.key === 'scale-summary')!
    expect(summary.text.startsWith('64 specs ')).toBe(true)
    expect(summary.text).toMatch(/▶\d+ · \d+ early · \d+ to close · ✓\d+/)
    expect(summary.segments?.length).toBeGreaterThan(3)
  })

  test('Ready to close, duplicate ids and the checks row (067 #32, #33, #34)', () => {
    const features = [
      ...mk(5),
      { id: '028', name: 'late', dir: '028-late', phase: 'done', done: 1, total: 30, warnings: [] } as Feature,
      { id: '029', name: 'a', dir: '029-a', phase: 'done', done: 3, total: 3, warnings: [] } as Feature,
      { id: '029', name: 'b', dir: '029-b', phase: 'done', done: 3, total: 3, warnings: [] } as Feature,
      { id: '044', name: 'ready', dir: '044-ready', phase: 'implement', done: 4, total: 4, warnings: [] } as Feature,
    ]
    const rows = rowsOf(st(features, { active: { dir: '001-n001', id: '001', name: 'n001', source: 'feature.json' } as never }), 'all', { open: ['001–050'] })
    const checks = rows.find(r => r.key === 'scale-checks')!
    expect(checks.text).toBe('▲ 2 checks · 028 done with 1/30 ticked · id 029 used twice')
    const dup = rows.filter(r => r.key.startsWith('feature-029'))
    expect(dup.length).toBe(2)
    expect(new Set(dup.map(r => r.key)).size).toBe(2)
    expect(dup.every(r => r.text.includes('▲ id×2'))).toBe(true)
    // The check sits under its own spec's row too.
    const i = rows.findIndex(r => r.key === 'feature-028')
    expect(rows[i + 1]?.text).toBe('▲ 028 done with 1/30 ticked')
    const focus = rowsOf(st(features, { active: { dir: '001-n001', id: '001', name: 'n001', source: 'feature.json' } as never }))
    expect(focus.some(r => r.key === 'section-close' && r.text === 'Ready to close 1')).toBe(true)
  })

  test('specs not read yet are one placeholder row per run (067 #36)', () => {
    const loading = (id: string): Feature => ({ id, name: `n${id}`, dir: `${id}-n${id}`, phase: 'specify', done: 0, total: 0, warnings: ['loading'] }) as Feature
    const features = [...mk(3), loading('040'), loading('041'), loading('042')]
    const rows = rowsOf(st(features), 'focus')
    const row = rows.find(r => r.key === 'loading-040')!
    expect(row.text).toBe('· 040–042 not read yet · reading in the background')
    expect(rows.some(r => r.key === 'feature-040')).toBe(false)
  })

  test('Touched this session leads, and a grouping other than status groups by it (067 #39, #40)', () => {
    const state = st(mk(20))
    const rows = rowsOf(state, 'focus', { touched: ['003-n003'] })
    const at = rows.findIndex(r => r.key === 'section-touched')
    expect(rows[at]?.text).toBe('Touched this session 1')
    expect(rows[at + 1]?.key).toBe('feature-003')
    const byPhase = rowsOf(state, 'all', { group: 'phase' })
    expect(byPhase.filter(r => r.key.startsWith('block-')).map(r => r.key).sort()).toEqual(['block-done', 'block-implement', 'block-specify'])
  })

  test('a spec with no task figures prints ?%, never 0% (067 #37)', () => {
    const rows = specsRows(st([{ id: '001', name: 'a', dir: '001-a', phase: 'tasks', done: 0, total: 0, warnings: [] } as Feature]), 100, 'en')
    expect(rows.find(r => r.key === 'feature-001')?.text).toContain('?%')
  })
})

describe('the tree, board 3 (075 FR-010, FR-011)', () => {
  test('every open task starts with ○, and a test task carries a tag at the right edge', () => {
    const text = '- [ ] T012 Write failing tests for out-of-stock items\n- [ ] T013 Block checkout\n- [ ] T014 Update tests/cart/page.test.ts\n'
    const rows = texts(kids(state({ currentTask: undefined }), text, { columns: 70 }))
    expect(rows[0]?.startsWith('    ○ T012')).toBe(true)
    expect(rows[0]?.includes('test')).toBe(true)
    expect(rows[1]?.startsWith('    ○ T013 Block checkout')).toBe(true)
    expect(rows[2]?.endsWith('test')).toBe(true)
  })
  test('the current task is a highlighted block; no group headers and no clock without a start time', () => {
    const rows = kids(state({ currentTask: { id: 'T013', text: 'Block checkout' } }), '- [ ] T012 a\n- [ ] T013 Block checkout\n')
    const current = rows.find(r => r.key === 'task-002-band-hint-T013')
    expect(current?.highlight).toBe(true)
    expect(current?.text).toBe('  ▶ T013 Block checkout')
    expect(rows.every(r => !['current', 'next', 'later'].includes(r.text))).toBe(true)
  })
})

describe('Specs rows, boards 3 and 6 (075 FR-007, FR-018, FR-019)', () => {
  test('section headings are the name and a count, with no parentheses', () => {
    const rows = texts(specsRows(state(), 80))
    expect(rows).toContain('Active 1')
    expect(rows.some(r => /\(\d+\)/.test(r) && r.startsWith('Active'))).toBe(false)
  })
  test('a row without progress ends with its track: quick · no tasks yet, quick, full, full · plan.md ✓', () => {
    const features = [
      { ...f('004', 'wish', 'specify', 0, 0), track: 'quick' as const },
      { ...f('005', 'cart', 'plan', 0, 0), track: 'full' as const },
      { ...f('006', 'pay', 'tasks', 0, 4), track: 'full' as const },
    ]
    const rows = texts(specsRows(state({ features, active: undefined }), 100, 'en', {}, {}, false, [], false, 'status', undefined, { view: 'all', filtered: true }))
    expect(rows.find(r => r.includes('004'))).toContain('quick · no tasks yet')
    expect(rows.find(r => r.includes('005'))).toMatch(/full$/)
    expect(rows.find(r => r.includes('006'))).toContain('full · plan.md ✓')
  })
  test('a check row offers to reconcile, and the suggestion names the folder and the finding', () => {
    const features = [f('028', 'config-tab', 'done', 1, 30)]
    const rows = specsRows(state({ features, active: undefined }), 100, 'en', {}, {}, false, [], false, 'status', undefined, { view: 'all', filtered: true })
    const check = rows.find(r => r.key.startsWith('check-'))
    expect(check?.action?.kind).toBe('reconcile')
    expect(reconcileSuggestion('028-config-tab\nstatus: done, but 29 tasks are open')).toBe('Reconcile specs/028-config-tab: status: done, but 29 tasks are open. Change only the files that disagree, and say what you changed.')
  })
})
