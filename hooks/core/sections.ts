// The Specs tab's sections, in the order they are drawn (066 #25). Pure: no $.
import type { Feature } from './types'

/** The sections in the order the Specs tab draws them (066 #25). */
export const SECTIONS = ['active', 'progress', 'early', 'close', 'next', 'done', 'abandoned'] as const
export type Section = (typeof SECTIONS)[number]

/**
 * The section a feature is drawn in (066 #25): the active one; in progress (ticks or implementing);
 * early (specify, clarify); ready to close (every task ticked, still active); next up (planned);
 * done; abandoned.
 */
/** Every task ticked while the front matter still says `active` (067 #32). */
export const isReadyToClose = (f: Pick<Feature, 'phase' | 'done' | 'total'>): boolean => f.phase === 'implement' && f.total > 0 && f.done >= f.total

export const displaySectionOf = (f: Pick<Feature, 'phase' | 'dir' | 'done' | 'total'>, activeDir: string | undefined): Section => {
  if (f.phase === 'done') return 'done'
  if (f.phase === 'abandoned') return 'abandoned'
  if (f.dir === activeDir) return 'active'
  if (isReadyToClose(f)) return 'close'
  if (f.done > 0 || f.phase === 'implement') return 'progress'
  if (f.phase === 'specify' || f.phase === 'clarify') return 'early'
  return 'next'
}
