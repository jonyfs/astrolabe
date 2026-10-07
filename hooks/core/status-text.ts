// The status line entry (contracts/status-entry.md). Pure: no $.
import { t, type Lang } from './i18n'
import type { SpeckitState } from './types'

const MARK = '◆'
const width = (text: string): number => [...text].length

/** Candidate texts from the fullest to the shortest; the first that fits wins. */
const candidates = (state: SpeckitState, lang: Lang): string[] => {
  if (!state.present) return [`${MARK} ${t(lang, 'status.noSpeckit')}`]
  const skill = state.runningSkill === undefined ? '' : ` · ${state.runningSkill.step}…`
  const active = state.active
  if (active === undefined) {
    const next = state.nextCommand === undefined ? '' : ` · ${t(lang, 'status.next')}: ${state.nextCommand}`
    const none = `${MARK} ${t(lang, 'status.noActive')}`
    return [`${none}${next}${skill}`, `${none}${next}`, none]
  }
  const id = `${MARK} ${state.activeWarning === undefined ? '' : '~'}${active.id}`
  const feature = state.features.find(f => f.dir === active.dir)
  if (feature === undefined) return [id]
  const phase = `${id} · ${feature.phase}`
  const withPercent = feature.total > 0 ? `${phase} ${Math.floor((feature.done * 100) / feature.total)}%` : phase
  return [`${withPercent}${skill}`, withPercent, phase, id]
}

export const formatStatus = (state: SpeckitState, columns?: number, lang: Lang = 'en'): string => {
  const all = candidates(state, lang)
  if (columns === undefined) return all[0] ?? ''
  return all.find(text => width(text) <= columns) ?? ''
}
