// A scroll thumb on the right edge of a list longer than the pane (067 #35). Pure: no $.
import type { PaneRow } from './pane'

const width = (text: string): number => [...text].length

/**
 * The rows in view with `┃` at the right edge of the cells that stand for the part of the list
 * in view: the thumb's length and place follow the window's share of `total`. A row that is
 * longer than the edge is left as it is.
 */
export const withThumb = (shown: readonly PaneRow[], start: number, total: number, columns: number): PaneRow[] => {
  const n = shown.length
  if (n === 0 || total <= n) return [...shown]
  const size = Math.max(1, Math.round((n * n) / total))
  const at = Math.min(n - size, Math.round((start / (total - n)) * (n - size)))
  const edge = Math.max(8, columns - 1)
  return shown.map((row, i) => {
    const mark = i >= at && i < at + size ? '┃' : ' '
    if (width(row.text) > edge - 2) return row
    const pad = ' '.repeat(edge - 1 - width(row.text))
    const text = `${row.text}${pad}${mark}`
    if (row.segments === undefined) return { ...row, text }
    return { ...row, text, segments: [...row.segments, { text: `${pad}${mark}`, role: 'faint' as const }] }
  })
}
