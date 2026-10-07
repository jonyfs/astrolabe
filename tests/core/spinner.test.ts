import { describe, expect, test } from 'claude-code/testing'

import { cleanTaskText, formatElapsed, spinnerSuffix } from '../../hooks/core/spinner'
import { emptyMemo, type SessionMemo, type SpeckitState } from '../../hooks/core/types'

const NOW = 1_000_000
const state = (over: Partial<SpeckitState> = {}): SpeckitState => ({
  present: true,
  constitution: 'ratified',
  features: [{ id: '002', name: 'x', dir: '002-x', phase: 'implement', done: 1, total: 4, warnings: [] }],
  active: { dir: '002-x', id: '002', name: 'x', source: 'feature.json' },
  currentTask: { id: 'T014', text: '[P] [US1] Write the parser tests in `tests/core/x.test.ts`', startedAt: NOW - 3 * 60_000 },
  isAnalyzed: true,
  ...over,
})
const working: SessionMemo = { ...emptyMemo(), runningSkill: { name: 'speckit-implement', step: 'implement' } }
const width = (s: string) => [...s].length

describe('cleanTaskText (FR-003)', () => {
  test('drops markers and backticks and collapses spaces', () => {
    expect(cleanTaskText('[P] [US1]  Write `a.ts`   now')).toBe('Write a.ts now')
    expect(cleanTaskText('[P]')).toBe('')
  })
})

describe('formatElapsed (contract)', () => {
  test('seconds, minutes, hours', () => {
    expect([formatElapsed(0), formatElapsed(800), formatElapsed(45_000), formatElapsed(12 * 60_000), formatElapsed(65 * 60_000)]).toEqual([
      '0s',
      '0s',
      '45s',
      '12m',
      '1h 5m',
    ])
    expect(formatElapsed(-5)).toBe('0s')
  })
})

describe('spinnerSuffix (FR-001, FR-002, FR-004)', () => {
  test('narrates the current task during a speckit-implement turn', () => {
    expect(spinnerSuffix(state(), working, NOW)).toBe('… T014 · Write the parser tests in tests/core/x.test.ts · 3m')
  })
  test('a touched active feature also counts as working on it', () => {
    expect(spinnerSuffix(state(), { ...emptyMemo(), touched: ['002-x'] }, NOW)).toMatch(/^… T014 · /)
  })
  test('quiet in a turn that did not work on the active feature', () => {
    expect(spinnerSuffix(state(), emptyMemo(), NOW)).toBeUndefined()
    expect(spinnerSuffix(state(), { ...emptyMemo(), touched: ['001-other'] }, NOW)).toBeUndefined()
    expect(spinnerSuffix(state(), { ...emptyMemo(), runningSkill: { name: 'speckit-plan', step: 'plan' } }, NOW)).toBeUndefined()
  })
  test('quiet without Spec Kit, an active feature or an open task', () => {
    expect(spinnerSuffix({ present: false, constitution: 'missing', features: [], isAnalyzed: false }, working, NOW)).toBeUndefined()
    const { active: _a, ...noActive } = state()
    expect(spinnerSuffix(noActive, working, NOW)).toBeUndefined()
    const { currentTask: _t, ...noTask } = state()
    expect(spinnerSuffix(noTask, working, NOW)).toBeUndefined()
  })
  test('a task without an id starts with its text and has no elapsed time', () => {
    expect(spinnerSuffix(state({ currentTask: { text: 'tidy up' } }), working, NOW)).toBe('… tidy up')
  })
  test('a task with only markers shows the id and the time', () => {
    expect(spinnerSuffix(state({ currentTask: { id: 'T001', text: '[P]', startedAt: NOW } }), working, NOW)).toBe('… T001 · 0s')
  })
  test('the budget is columns - 40, or 80 without a width', () => {
    const long = state({ currentTask: { id: 'T014', text: 'x'.repeat(200), startedAt: NOW } })
    expect(width(spinnerSuffix(long, working, NOW) ?? '')).toBe(80)
    expect(spinnerSuffix(long, working, NOW, 60)).toBe(`… T014 · ${'x'.repeat(5)}… · 0s`)
  })
  test('every budget keeps the id whole, or leaves the spinner alone', () => {
    for (let columns = 40; columns <= 160; columns += 1) {
      const suffix = spinnerSuffix(state(), working, NOW, columns)
      if (suffix === undefined) continue
      expect(width(suffix) <= columns - 40).toBe(true)
      expect(suffix.startsWith('… T014')).toBe(true)
      expect(suffix.endsWith(' · 3m')).toBe(true)
    }
    expect(spinnerSuffix(state(), working, NOW, 50)).toBeUndefined()
    expect(spinnerSuffix(state(), working, NOW, 53)).toBe('… T014 · 3m')
  })
})
