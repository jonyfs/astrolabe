// The glyphs a row uses for a state, and the few wide ones the emoji icon set may carry
// (064 #3). A state mark is one cell wide in every set, so a row that changes state never
// moves by a column. Pure: no $.

/** Paused, elapsed time and warning: narrow glyphs, in place of ⏸ ⏱ ⚠. */
export const STATE_GLYPHS = { paused: '‖', elapsed: '◷', warning: '▲' } as const

/**
 * Characters of the emoji icon set that terminals draw two cells wide although their code
 * point is below the pictograph block. `textWidth` counts exactly these as two.
 */
export const EMOJI_WIDE: readonly string[] = ['⏳', '⏱', '⚠']
