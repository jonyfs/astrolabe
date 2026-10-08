import { describe, expect, test } from 'claude-code/testing'

import { activeMark, formatStatus } from '../../hooks/core/status-text'
import type { Feature, SpeckitState } from '../../hooks/core/types'

const feature = (over: Partial<Feature> = {}): Feature => ({
  id: '002',
  name: 'band-hint',
  dir: '002-band-hint',
  phase: 'implement',
  done: 9,
  total: 20,
  warnings: [],
  ...over,
})

const state = (over: Partial<SpeckitState> = {}, f: Feature | null = feature()): SpeckitState => ({
  present: true,
  root: '/proj',
  constitution: 'ratified',
  features: f ? [f] : [],
  active: f ? { dir: f.dir, id: f.id, name: f.name, source: 'feature.json' } : undefined,
  isAnalyzed: false,
  nextCommand: '/speckit-implement',
  ...over,
})

const width = (s: string) => [...s].length

describe('formatStatus: each state of the contract', () => {
  test('no Spec Kit', () => {
    expect(formatStatus({ present: false, constitution: 'missing', features: [], isAnalyzed: false })).toBe('◆ no Spec Kit')
  })
  test('no active feature names the next command', () => {
    expect(formatStatus(state({ nextCommand: '/speckit-specify' }, null))).toBe('◆ no active feature · next: /speckit-specify')
  })
  test('active feature with tasks shows a floored percentage', () => {
    expect(formatStatus(state())).toBe('◆ 002 · implement 45%')
    expect(formatStatus(state({}, feature({ done: 2, total: 3 })))).toBe('◆ 002 · implement 66%')
  })
  test('active feature without tasks shows the phase alone', () => {
    expect(formatStatus(state({}, feature({ phase: 'plan', done: 0, total: 0 })))).toBe('◆ 002 · plan')
  })
  test('a guessed feature carries ~', () => {
    expect(formatStatus(state({ activeWarning: 'feature-json-dangling' }))).toBe('◆ ~002 · implement 45%')
  })
  test('a running skill hint is appended', () => {
    expect(formatStatus(state({ runningSkill: { name: 'speckit-plan', step: 'plan' } }, feature({ phase: 'plan', total: 0, done: 0 })))).toBe(
      '◆ 002 · plan · plan…',
    )
  })
  test('an active feature missing from the list degrades to its id', () => {
    const s = state()
    expect(formatStatus({ ...s, features: [] })).toBe('◆ 002')
  })
})

describe('formatStatus: width degradation never cuts an id', () => {
  const full = state({ activeWarning: 'feature-json-malformed', runningSkill: { name: 'speckit-implement', step: 'implement' } })
  test('fits whole at 80, 100, 144 and 200 columns', () => {
    for (const columns of [80, 100, 144, 200]) {
      expect(formatStatus(full, columns)).toBe('◆ ~002 · implement 45% · implement…')
    }
  })
  test('drops the skill, then the percentage, then the phase, then everything', () => {
    expect(formatStatus(full, 30)).toBe('◆ ~002 · implement 45%')
    expect(formatStatus(full, 20)).toBe('◆ ~002 · implement')
    expect(formatStatus(full, 10)).toBe('◆ ~002')
    expect(formatStatus(full, 6)).toBe('◆ ~002')
    expect(formatStatus(full, 5)).toBe('')
  })
  test('every budget from 0 to 60 fits and keeps the id whole or absent', () => {
    for (let columns = 0; columns <= 60; columns += 1) {
      const text = formatStatus(full, columns)
      expect(width(text) <= columns).toBe(true)
      expect(text === '' || text.includes('~002')).toBe(true)
    }
  })
  test('the no-active entry drops its next part first', () => {
    const s = state({ nextCommand: '/speckit-specify' }, null)
    expect(formatStatus(s, 25)).toBe('◆ no active feature')
    expect(formatStatus(s, 10)).toBe('')
  })
})

describe('one name for the active feature (054 #30)', () => {
  test('◆ and the id, with ~ when the feature is a guess', () => {
    expect(activeMark({ active: { id: '002', name: 'band-hint', dir: '002-band-hint', source: 'feature.json' } } as never)).toBe('◆ 002')
    expect(activeMark({ active: { id: '002', name: 'band-hint', dir: '002-band-hint', source: 'latest' }, activeWarning: 'fallback' } as never)).toBe('◆ ~002')
    expect(activeMark({} as never)).toBe('◆')
  })
})
