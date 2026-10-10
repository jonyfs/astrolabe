import { describe, expect, test } from 'claude-code/testing'

import { capDiff, foldedDiff } from '../../hooks/core/summary'

describe('capDiff (052 #19)', () => {
  test('at most 6 lines and a count of the rest', () => {
    const text = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].join('\n')
    expect(capDiff(text, 'en')).toBe('a\nb\nc\nd\ne\nf\n… +2 lines')
    expect(capDiff('a\nb', 'en')).toBe('a\nb')
  })
})

describe('foldedDiff (045 #48)', () => {
  test('one line: what the last turn added and removed, and how long ago', () => {
    expect(foldedDiff('+++ b\n--- a\n+- [x] T001\n+- [x] T002\n-- [ ] T001', 'tasks.md', 7 * 60_000, 'en')).toBe('last turn: +2 −1 in tasks.md, 7m ago')
  })
})
