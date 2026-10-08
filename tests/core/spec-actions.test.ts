import { describe, expect, test } from 'claude-code/testing'

import { byPriority, configMark, nextPriority, parsePriority, priorityMark, reviewPrompt, withPriority } from '../../hooks/core/spec-actions'

describe('spec priorities (051)', () => {
  test('parse, cycle and store only what is not normal', () => {
    expect(parsePriority('priority 2 high')).toEqual({ id: '002', level: 'high' })
    expect(parsePriority('priority 002 LOW')).toEqual({ id: '002', level: 'low' })
    expect(parsePriority('priority x high')).toBeUndefined()
    expect([nextPriority(undefined), nextPriority('high'), nextPriority('low')]).toEqual(['high', 'low', 'normal'])
    expect(withPriority({ '001': 'high' }, '002', 'low')).toEqual({ '001': 'high', '002': 'low' })
    expect(withPriority({ '001': 'high' }, '001', 'normal')).toEqual({})
  })
  test('high first, low last, the rest in their order; marks', () => {
    const fs = [{ id: '001' }, { id: '002' }, { id: '003' }, { id: '004' }]
    expect(byPriority(fs, { '001': 'low', '003': 'high' }).map(f => f.id)).toEqual(['003', '002', '004', '001'])
    expect([priorityMark('high'), priorityMark('low'), priorityMark(undefined)]).toEqual(['↑', '↓', ' '])
  })
  test('the review prompt carries the files and the principles, and leaves out what is empty', () => {
    const text = reviewPrompt({ id: '002', name: 'b' }, { spec: 'SPEC', plan: '', tasks: 'TASKS' }, ['I. Tests first'])
    expect(text).toContain('Review the Spec Kit feature 002 b')
    expect(text).toContain("The project's principles: I. Tests first.")
    expect(text).toContain('--- spec.md\nSPEC')
    expect(text).not.toContain('--- plan.md')
    expect(text).toContain('--- tasks.md\nTASKS')
  })
})

describe('configMark (052 #39)', () => {
  test('● a draft change, • a saved value off its default, blank otherwise', () => {
    const d = { 'astrolabe.preset': 'compact' }
    expect(configMark(true, 'full', d, 'astrolabe.preset')).toBe('● ')
    expect(configMark(false, 'full', d, 'astrolabe.preset')).toBe('• ')
    expect(configMark(false, 'compact', d, 'astrolabe.preset')).toBe('  ')
    expect(configMark(false, 'x', d, 'astrolabe.other')).toBe('  ')
  })
})
