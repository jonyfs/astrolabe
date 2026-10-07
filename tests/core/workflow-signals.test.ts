import { describe, expect, test } from 'claude-code/testing'

import { checklistCounts, clarificationCount } from '../../hooks/core/clarification'
import { compactSpec } from '../../hooks/core/compact'
import { detectDrift } from '../../hooks/core/drift'
import { specsRows } from '../../hooks/core/pane'
import { phaseToasts } from '../../hooks/core/phase-toast'

const task = (text: string) => ({ id: 'T009', text, isDone: true, line: 9 })
const win = (edits: string[]) => ({ edits, sawShell: false, alarmed: false })

describe('[NEEDS CLARIFICATION] count (020b #16)', () => {
  test('markers outside code are counted, and the count survives compaction', () => {
    const spec = 'a [NEEDS CLARIFICATION: x]\nb [NEEDS CLARIFICATION: y]\n`[NEEDS CLARIFICATION` in code\n```\n[NEEDS CLARIFICATION: z]\n```\n'
    expect(clarificationCount(spec)).toBe(2)
    expect(clarificationCount(compactSpec(spec))).toBe(2)
    expect(clarificationCount('nothing')).toBe(0)
  })
})

describe('checklists (020b #15)', () => {
  test('open and total items across a feature checklists', () => {
    expect(checklistCounts(['- [x] a\n- [ ] b\n', '- [X] c\n* [ ] d\ntext\n'])).toEqual({ open: 2, total: 4 })
    expect(checklistCounts([])).toEqual({ open: 0, total: 0 })
  })
})

describe('pane rows for open questions and checklists (020b)', () => {
  const state = (over: Record<string, unknown>) =>
    ({
      present: true,
      constitution: 'ratified',
      features: [{ id: '002', name: 'b', dir: '002-b', phase: 'clarify', done: 0, total: 0, warnings: [], ...over }],
      active: { dir: '002-b', id: '002', name: 'b', source: 'feature.json' },
      isAnalyzed: false,
    }) as never
  test('a feature with open questions says how many', () => {
    expect(specsRows(state({ clarifications: 3 }), 80).map(r => r.text)).toContain('? 002: 3 [NEEDS CLARIFICATION] markers to answer (/speckit-clarify)')
  })
  test('open checklist items are named', () => {
    expect(specsRows(state({ phase: 'implement', checklist: { open: 2, total: 12 } }), 80).map(r => r.text)).toContain('☐ 002: 2 of 12 checklist items open')
  })
})

describe('a test task ticked with no test changed (020b #24)', () => {
  test('alarms when the task names tests and only non-test files changed', () => {
    expect(detectDrift(task('Write the tests for the parser'), win(['src/parser.ts']))).toBe('🧭 T009 was ticked, but no test file changed')
    expect(detectDrift(task('Write the tests for the parser'), win(['src/parser.ts', 'tests/parser.test.ts']))).toBeUndefined()
    expect(detectDrift(task('Implement the parser'), win(['src/parser.ts']))).toBeUndefined()
  })
})

describe('the feature-done toast names the next steps (020b #20)', () => {
  test('specify the next feature, or converge first', () => {
    const f = { id: '002', name: 'b', dir: '002-b', phase: 'done', done: 3, total: 3, warnings: [] } as never
    const out = phaseToasts([f], { '002-b': 'implement' }, [], true)
    expect(out.toasts[0]?.text).toBe('🧭 002 b is done · next: /speckit-specify · check first: /speckit-converge')
  })
})
