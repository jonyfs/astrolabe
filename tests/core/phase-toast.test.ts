import { describe, expect, test } from 'claude-code/testing'

import { phaseToasts } from '../../hooks/core/phase-toast'
import type { Feature, Phase } from '../../hooks/core/types'

const f = (id: string, phase: Phase): Feature => ({ id, name: `f${id}`, dir: `${id}-f${id}`, phase, done: 0, total: 0, warnings: [] })

describe('phaseToasts (FR-001)', () => {
  test('the first reconcile of a session is silent and sets the baseline', () => {
    const out = phaseToasts([f('002', 'tasks')], { '002-f002': 'plan' }, [], false)
    expect(out).toEqual({ toasts: [], baseline: { '002-f002': 'tasks' }, toasted: [] })
  })
  test('a move to a later phase toasts once with the next command', () => {
    const out = phaseToasts([f('002', 'tasks')], { '002-f002': 'plan' }, [], true)
    expect(out.toasts).toEqual([{ key: '002-f002:tasks', text: '🧭 002 f002 moved to tasks · next: /speckit-tasks' }])
    expect(out.toasted).toEqual(['002-f002:tasks'])
    expect(phaseToasts([f('002', 'tasks')], { '002-f002': 'plan' }, out.toasted, true).toasts).toEqual([])
  })
  test('done has its own text', () => {
    expect(phaseToasts([f('002', 'done')], { '002-f002': 'implement' }, [], true).toasts[0]?.text).toBe(
      '🧭 002 f002 is done · next: /speckit-specify',
    )
  })
  test('the next command per phase', () => {
    const next = (phase: Phase) => phaseToasts([f('001', phase)], { '001-f001': 'specify' }, [], true).toasts[0]?.text
    expect([next('clarify'), next('plan'), next('implement')]).toEqual([
      '🧭 001 f001 moved to clarify · next: /speckit-clarify',
      '🧭 001 f001 moved to plan · next: /speckit-plan',
      '🧭 001 f001 moved to implement · next: /speckit-implement',
    ])
  })
  test('backwards, unchanged, new and abandoned features are silent', () => {
    const out = phaseToasts([f('001', 'plan'), f('002', 'tasks'), f('003', 'implement'), f('004', 'abandoned')], {
      '001-f001': 'tasks',
      '002-f002': 'tasks',
      '004-f004': 'plan',
    }, [], true)
    expect(out.toasts).toEqual([])
    expect(out.baseline).toEqual({ '001-f001': 'plan', '002-f002': 'tasks', '003-f003': 'implement', '004-f004': 'abandoned' })
  })
})

describe('review fixes', () => {
  test('a feature leaving abandoned never toasts', () => {
    expect(phaseToasts([f('002', 'plan')], { '002-f002': 'abandoned' }, [], true).toasts).toEqual([])
  })
  test('the active feature names its real next command', () => {
    const out = phaseToasts([f('002', 'implement')], { '002-f002': 'tasks' }, [], true, { '002-f002': '/speckit-analyze' })
    expect(out.toasts[0]?.text).toBe('🧭 002 f002 moved to implement · next: /speckit-analyze')
  })
})
