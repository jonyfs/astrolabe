// Ids as people read them (064 #4): a task id exactly as written in tasks.md, a feature id
// padded with spaces to the widest id of the project so names start in one column, never cut.
// Pure: no $.

/** The widest id, at least `min` cells (3: `001`). */
export const idWidth = (ids: readonly string[], min = 3): number => Math.max(min, ...ids.map(id => [...id].length))

/** An id padded on the right to `width`. Never shorter than the id itself. */
export const padId = (id: string, width: number): string => {
  const length = [...id].length
  return length >= width ? id : `${id}${' '.repeat(width - length)}`
}
