// The status line entry (contracts/status-entry.md). Pure: no $.
import type { SpeckitState } from './types'

const MARK = '◆'
const width = (text: string): number => [...text].length

/** Candidate texts from the fullest to the shortest; the first that fits wins. */
const candidates = (state: SpeckitState): string[] => {
  if (!state.present) return [`${MARK} no Spec Kit`]
  const skill = state.runningSkill === undefined ? '' : ` · ${state.runningSkill.step}…`
  const active = state.active
  if (active === undefined) {
    const next = state.nextCommand === undefined ? '' : ` · next: ${state.nextCommand}`
    return [`${MARK} no active feature${next}${skill}`, `${MARK} no active feature${next}`, `${MARK} no active feature`]
  }
  const id = `${MARK} ${state.activeWarning === undefined ? '' : '~'}${active.id}`
  const feature = state.features.find(f => f.dir === active.dir)
  if (feature === undefined) return [id]
  const phase = `${id} · ${feature.phase}`
  const withPercent = feature.total > 0 ? `${phase} ${Math.floor((feature.done * 100) / feature.total)}%` : phase
  return [`${withPercent}${skill}`, withPercent, phase, id]
}

export const formatStatus = (state: SpeckitState, columns?: number): string => {
  const all = candidates(state)
  if (columns === undefined) return all[0] ?? ''
  return all.find(text => width(text) <= columns) ?? ''
}
