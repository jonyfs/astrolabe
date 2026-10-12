// The status entry's lead (065 #15): the feature, its phase and percentage, and the window
// that decides, in one line. The id and the deciding window are never dropped; the reset goes
// first, then the phase takes its short form, then the phase itself. Pure: no $.
import type { Decision } from './governor'
import { usageSegment } from './governor'
import { resetIn } from './duration'
import { phaseShort } from './phase'
import { joinZones } from './zones'
import { activeMark } from './status-text'
import { t, type Lang } from './i18n'
import type { SpeckitState } from './types'

const width = (text: string): number => [...text].length

export const statusLead = (
  state: SpeckitState,
  decision: Decision | undefined,
  columns: number,
  now: number,
  lang: Lang = 'en',
  thresholds?: { hold?: number; stop?: number },
  /** Cells the engine takes from the line (its mod marker); the tier still follows `columns`. */
  reserve = 0,
): string => {
  if (!state.present) return `◆ ${t(lang, 'status.noSpeckit')}`
  const active = state.active
  const feature = state.features.find(f => f.dir === active?.dir)
  if (active === undefined) return `◆ ${t(lang, 'status.noActive')}`
  const id = activeMark(state)
  const percent = feature !== undefined && feature.total > 0 ? `${Math.floor((feature.done * 100) / feature.total)}%` : ''
  const window = decision === undefined ? undefined : usageSegment(decision, lang, thresholds)
  const reset = decision?.highest?.resetsAt
  const at = reset === undefined || decision?.highest?.renewed === true ? undefined : resetIn(reset, now)
  const phase = feature?.phase
  // Candidates, widest first; the first that fits wins, the last one is the id and the window.
  const feat = (p: string | undefined) => [id, p, percent].filter(x => x !== undefined && x !== '').join(' ')
  const win = (withReset: boolean) =>
    window === undefined ? undefined : withReset && at !== undefined && at !== '?' ? joinZones([[window, at]]) : window
  const lines = [
    joinZones([[feat(phase)], ...(window === undefined ? [] : [[win(true)!]])]),
    joinZones([[feat(phase === undefined ? undefined : phaseShort(phase))], ...(window === undefined ? [] : [[win(false)!]])]),
    joinZones([[feat(undefined)], ...(window === undefined ? [] : [[win(false)!]])]),
    joinZones([[id], ...(window === undefined ? [] : [[win(false)!]])]),
  ]
  // The board's tiers (200 and 144, then 100, then 80), and below them whatever still fits.
  const from = columns >= 144 ? 0 : columns >= 100 ? 1 : 2
  return lines.slice(from).find(line => width(line) <= columns - reserve) ?? lines.at(-1)!
}
