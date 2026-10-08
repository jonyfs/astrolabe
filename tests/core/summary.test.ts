import { describe, expect, test } from 'claude-code/testing'

import { capDiff } from '../../hooks/core/summary'

describe('capDiff (052 #19)', () => {
  test('at most 6 lines and a count of the rest', () => {
    const text = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].join('\n')
    expect(capDiff(text, 'en')).toBe('a\nb\nc\nd\ne\nf\n… +2 lines')
    expect(capDiff('a\nb', 'en')).toBe('a\nb')
  })
})
