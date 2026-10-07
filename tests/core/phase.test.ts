import { describe, expect, test } from 'claude-code/testing'

import { deriveFeature } from '../../hooks/core/phase'

const tasks = (done: number, open: number) =>
  [...Array(done).keys()].map(i => `- [X] T${String(i + 1).padStart(3, '0')} done`).join('\n') +
  '\n' +
  [...Array(open).keys()].map(i => `- [ ] T${String(done + i + 1).padStart(3, '0')} open`).join('\n')

const fm = (body: string) => `---\n${body}\n---\n# Spec\n`

describe('deriveFeature: the FR-005 decision table in order', () => {
  test('row 1: status abandoned wins over everything', () => {
    expect(deriveFeature({ dir: '003-x', spec: fm('status: abandoned\ntrack: quick'), plan: true, tasks: tasks(1, 1) }).phase).toBe('abandoned')
  })
  test('row 2: status done, even with half the tasks open', () => {
    expect(deriveFeature({ dir: '003-x', spec: fm('status: done'), plan: true, tasks: tasks(1, 1) }).phase).toBe('done')
  })
  test('row 3: no spec.md', () => {
    expect(deriveFeature({ dir: '003-x', plan: true, tasks: tasks(1, 1) }).phase).toBe('specify')
  })
  test('row 4: track quick stays in implement without plan or tasks', () => {
    expect(deriveFeature({ dir: '003-x', spec: fm('track: quick'), plan: false }).phase).toBe('implement')
  })
  test('row 5: clarification markers without a plan', () => {
    expect(deriveFeature({ dir: '003-x', spec: '# Spec\n[NEEDS CLARIFICATION: auth?]\n', plan: false }).phase).toBe('clarify')
  })
  test('row 6: no plan.md', () => {
    expect(deriveFeature({ dir: '003-x', spec: '# Spec\n', plan: false }).phase).toBe('plan')
  })
  test('row 7: no tasks.md, or zero tasks', () => {
    expect(deriveFeature({ dir: '003-x', spec: '# Spec\n', plan: true }).phase).toBe('tasks')
    expect(deriveFeature({ dir: '003-x', spec: '# Spec\n', plan: true, tasks: '# Tasks\nnothing yet\n' }).phase).toBe('tasks')
  })
  test('row 8: open tasks', () => {
    const f = deriveFeature({ dir: '002-band-hint', spec: '# Spec\n', plan: true, tasks: tasks(9, 11) })
    expect([f.phase, f.done, f.total]).toEqual(['implement', 9, 20])
  })
  test('row 9: all ticked but status active waits in implement at 100%', () => {
    const f = deriveFeature({ dir: '003-x', spec: fm('status: active'), plan: true, tasks: tasks(3, 0) })
    expect([f.phase, f.done, f.total]).toEqual(['implement', 3, 3])
  })
  test('row 10: all ticked', () => {
    expect(deriveFeature({ dir: '003-x', spec: '# Spec\n', plan: true, tasks: tasks(3, 0) }).phase).toBe('done')
  })
})

describe('deriveFeature: identity, front matter, current task and warnings', () => {
  test('id and name come from the directory', () => {
    const f = deriveFeature({ dir: '002-band-hint', spec: fm('track: full\nstatus: active'), plan: false })
    expect([f.id, f.name, f.dir, f.track, f.status]).toEqual(['002', 'band-hint', '002-band-hint', 'full', 'active'])
  })
  test('current task is the first open one', () => {
    expect(deriveFeature({ dir: '002-x', spec: '#', plan: true, tasks: tasks(2, 2) }).currentTask).toEqual({ id: 'T003', text: 'open' })
  })
  test('clarification markers after the plan exist are a warning, not a phase', () => {
    const f = deriveFeature({ dir: '002-x', spec: '[NEEDS CLARIFICATION: x]', plan: true, tasks: tasks(1, 1) })
    expect([f.phase, f.warnings]).toEqual(['implement', ['clarification-after-plan']])
  })
  test('no warnings in the normal case', () => {
    expect(deriveFeature({ dir: '002-x', spec: '#', plan: true }).warnings).toEqual([])
  })
})

describe('clarification markers in code do not count (010 FR-004)', () => {
  test('a marker quoted in backticks or a code block is documentation, not a question', () => {
    const quoted = '# Spec\nThe phase is `clarify` while `[NEEDS CLARIFICATION` remains.\n```text\n[NEEDS CLARIFICATION: example]\n```\n'
    expect(deriveFeature({ dir: '003-x', spec: quoted, plan: false }).phase).toBe('plan')
    expect(deriveFeature({ dir: '003-x', spec: quoted, plan: true }).warnings).toEqual([])
  })
  test('a real marker still counts', () => {
    expect(deriveFeature({ dir: '003-x', spec: '- FR-1: [NEEDS CLARIFICATION: which provider?]\n', plan: false }).phase).toBe('clarify')
  })
})
