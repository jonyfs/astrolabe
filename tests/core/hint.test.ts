import { describe, expect, test } from 'claude-code/testing'

import { hintTail } from '../../hooks/core/hint'
import type { Feature, Phase, SpeckitState } from '../../hooks/core/types'

const state = (phase: Phase, done: number, total: number, next: string | undefined): SpeckitState => {
  const f: Feature = { id: '002', name: 'x', dir: '002-x', phase, done, total, warnings: [] }
  return {
    present: true,
    constitution: 'ratified',
    features: [f],
    active: { dir: f.dir, id: f.id, name: f.name, source: 'feature.json' },
    isAnalyzed: false,
    ...(next === undefined ? {} : { nextCommand: next }),
  }
}

describe('hintTail (FR-007)', () => {
  test('implement with open tasks counts what is left', () => {
    expect(hintTail(state('implement', 14, 31, '/speckit-implement'), true)).toBe('next: /speckit-implement · 17 tasks left')
    expect(hintTail(state('implement', 30, 31, '/speckit-implement'), true)).toBe('next: /speckit-implement · 1 task left')
  })
  test('other phases name the command alone', () => {
    expect(hintTail(state('plan', 0, 0, '/speckit-plan'), true)).toBe('next: /speckit-plan')
    expect(hintTail(state('implement', 0, 5, '/speckit-analyze'), true)).toBe('next: /speckit-analyze · 5 tasks left')
  })
  test('quiet while the prompt is empty (the suggestion carries the command, 065 #14)', () => {
    expect(hintTail(state('plan', 0, 0, '/speckit-plan'), false)).toBeUndefined()
  })
  test('quiet without Spec Kit or with no next command', () => {
    expect(hintTail({ present: false, constitution: 'missing', features: [], isAnalyzed: false }, true)).toBeUndefined()
    expect(hintTail(state('plan', 0, 0, undefined), true)).toBeUndefined()
  })
})
