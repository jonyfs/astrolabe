import { describe, expect, test } from 'claude-code/testing'

import type { PaneRow } from '../../hooks/core/pane'
import { withThumb } from '../../hooks/core/thumb'

const rows = (n: number): PaneRow[] => Array.from({ length: n }, (_, i) => ({ key: `r${i}`, text: `row ${i}`, role: 'text' as const }))

describe('the scroll thumb (067 #35)', () => {
  test('a list that fits has none', () => {
    expect(withThumb(rows(5), 0, 5, 40).map(r => r.text)).toEqual(rows(5).map(r => r.text))
  })
  test('the thumb sits at the top, in the middle and at the bottom', () => {
    const thumbAt = (start: number) => withThumb(rows(10), start, 100, 20).map(r => r.text.endsWith('┃'))
    expect(thumbAt(0)[0]).toBe(true)
    expect(thumbAt(90)[9]).toBe(true)
    const mid = thumbAt(45)
    expect(mid.filter(Boolean).length).toBeGreaterThan(0)
    expect(mid[0]).toBe(false)
  })
  test('every row ends at the same column, the thumb in the last cell', () => {
    const out = withThumb(rows(10), 20, 60, 30)
    expect(new Set(out.map(r => [...r.text].length)).size).toBe(1)
    expect([...out[0]!.text].length).toBe(29)
  })
  test('coloured rows keep their segments and gain the edge cell', () => {
    const [row] = withThumb([{ key: 'a', text: 'ab', role: 'text', segments: [{ text: 'a', role: 'done' }, { text: 'b', role: 'text' }] }], 0, 40, 12)
    expect(row?.segments?.map(s => s.text).join('')).toBe(row?.text)
  })
})
