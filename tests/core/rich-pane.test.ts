import { describe, expect, test } from 'claude-code/testing'

import { bandSegments } from '../../hooks/core/band'
import { specSummary, tasksDiff } from '../../hooks/core/summary'
import { themeOf } from '../../hooks/core/theme'
import type { SpeckitState } from '../../hooks/core/types'

describe("the active spec's summary (024 #7)", () => {
  test('a quick spec: its title and first paragraph', () => {
    const text = '---\ntrack: quick\n---\n\n# Quick spec: Usage and cost\n\n**Created**: 2026-10-07\n\nWarn before the money runs out.\nAnd before the context does.\n\n## Tasks\n\n- [ ] T001 a\n'
    expect(specSummary(text)).toBe('**Usage and cost**\n\nWarn before the money runs out. And before the context does.')
  })
  test('a full spec: the user stories by priority', () => {
    const text = '# Feature Specification: Checkout\n\n**Feature Branch**: `004-checkout`\n\n## User Scenarios & Testing\n\n### User Story 1 - Pay by card (Priority: P1)\n\nA buyer pays.\n\n### User Story 2 - Refund (Priority: P2)\n\nText.\n'
    expect(specSummary(text)).toBe('**Checkout**\n\nA buyer pays.\n\n- Pay by card (P1)\n- Refund (P2)')
  })
  test('nothing to say: undefined', () => {
    expect(specSummary('')).toBeUndefined()
    expect(specSummary('# Spec\n')).toBe('**Spec**')
  })
  test('a long paragraph is cut at 400 characters', () => {
    const summary = specSummary(`# T\n\n${'word '.repeat(200)}\n`) ?? ''
    expect(summary.length).toBeLessThanOrEqual('**T**\n\n'.length + 401)
    expect(summary.endsWith('…')).toBe(true)
  })
})

describe("the turn's tasks.md diff (024 #8)", () => {
  test('ticked tasks as hunks with their own line numbers', () => {
    const before = [
      { id: 'T001', text: 'a', isDone: true, line: 3 },
      { id: 'T002', text: 'b', isDone: false, line: 4 },
      { id: 'T003', text: 'c', isDone: false, line: 6 },
    ]
    const after = before.map(t => (t.id === 'T001' ? t : { ...t, isDone: true }))
    expect(tasksDiff(before, after)).toBe('@@ -4,1 +4,1 @@\n-- [ ] T002 b\n+- [x] T002 b\n@@ -6,1 +6,1 @@\n-- [ ] T003 c\n+- [x] T003 c\n')
    expect(tasksDiff(before, before)).toBeUndefined()
  })
})

describe('a compact band below 80 columns (024 #12)', () => {
  const state: SpeckitState = {
    present: true,
    constitution: 'ratified',
    active: { id: '002', dir: '002-band-hint', name: 'band-hint', source: 'feature.json' },
    features: [{ id: '002', name: 'band-hint', dir: '002-band-hint', phase: 'implement', done: 9, total: 20, warnings: [] }],
    isAnalyzed: true,
  } as SpeckitState
  test('the id, the current step and the count', () => {
    const text = bandSegments(state, 30).map(s => s.text).join('')
    expect(text).toBe('◆ 002  ◐ implement 9/20 45%')
  })
  test('narrower still: the id and the step', () => {
    expect(bandSegments(state, 20).map(s => s.text).join('')).toBe('◆ 002  ◐ implement')
  })
})

describe("colors from Claude Code's theme (024 #11)", () => {
  test('flavor theme names theme keys, so light and dark both follow', () => {
    const tokens = themeOf({ flavor: 'theme' })
    expect(tokens.accent).toBe('claude')
    expect(tokens.done).toBe('success')
    expect(tokens.text).toBe('text')
  })
})
